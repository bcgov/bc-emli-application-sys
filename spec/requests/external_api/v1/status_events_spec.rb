require "swagger_helper"

# Ingest only: these specs assert that events are *recorded*,
# never that submission status changed - driving the state machine is the
# processor's job and lands in a later phase.
RSpec.describe "external_api/v1/status_events",
               type: :request,
               openapi_spec: "external_api/v1/swagger.yaml" do
  let(:program) { create(:program, external_api_state: "j_on") }
  let!(:external_api_key) { create(:external_api_key, program: program) }
  let!(:token) { external_api_key.token }
  let!(:Authorization) { "Bearer #{token}" }
  let(:permit_application) { create(:permit_application, program: program) }

  # Specs run in the development environment here (RAILS_ENV is already set in the
  # container, so rails_helper's ||= "test" never applies), and development's host
  # allowlist rejects rack-test's default www.example.com with a 403.
  before { host! "localhost" }

  def sample_payload(overrides = {})
    {
      event_id: SecureRandom.uuid,
      event_type: "APPROVED",
      event_datetime: "2026-09-11T18:00:00Z",
      record_type: "PARTICIPANT",
      application_id: permit_application.number,
      order_id: SecureRandom.uuid,
      eligibility_code: "ESP1-ABC123",
      income_bracket: "ESP Level 2",
      approved_date: "2026-09-10",
      updated_by_user_id: "0055f00000AbCdEfGHI"
    }.merge(overrides)
  end

  # Always look a row up by the event_id we sent. `SubmissionStatusEvent.last`
  # orders by a UUID primary key, so it is non-deterministic - and these specs run
  # against the development database, where unrelated rows already exist.
  def recorded(event_id)
    SubmissionStatusEvent.find_by!(event_id: event_id)
  end

  path "/status_events" do
    post "Records a single status event. The event is stored and acknowledged; it does not change submission status synchronously - a separate process applies it. Send one event per request; a JSON array is rejected. Retries are safe and expected: event_id is the idempotency key, so re-sending an event already received is a no-op. IMPORTANT: a 200 means the event was recorded, not that it was applied. An application_id that matches no known submission is still recorded and still returns 200, with matched=false in the response - this system issues the submission numbers, so an unrecognised one is investigated on this side rather than reported back as an error." do
      tags "Status Events"
      consumes "application/json"
      produces "application/json"

      parameter name: :body,
                in: :body,
                required: true,
                schema: {
                  "$ref" => "#/components/schemas/StatusEvent"
                }

      # One block only - OpenAPI permits a single response per status code, so a
      # second response(200, ...) would silently overwrite this one. The
      # unmatched case is covered in the behaviour specs below.
      response(
        200,
        "Recorded. Check the matched flag: true means the event was linked to a submission, false means application_id matched nothing and the event was stored unlinked for investigation on our side. Both are 200 - neither indicates the status change has been applied yet."
      ) do
        schema "$ref" => "#/components/schemas/StatusEventAck"

        let(:body) { sample_payload }

        run_test! do |res|
          data = JSON.parse(res.body)
          expect(data["data"]["event_id"]).to eq(body[:event_id])
          expect(data["data"]["matched"]).to eq(true)
          # Echoed only on a miss - on a match it would be noise.
          expect(data["data"]).not_to have_key("application_id")

          event = recorded(body[:event_id])
          expect(event.permit_application).to eq(permit_application)
          expect(event.application_id).to eq(permit_application.number)
          expect(event.processed_at).to be_nil
          expect(event.outcome).to be_nil
        end
      end

      response(
        422,
        "Rejected without being recorded. Either event_id was missing, or a JSON array was sent - this endpoint takes one event per request. The meta.message says which."
      ) do
        schema "$ref" => "#/components/schemas/ResponseErrorDetailed"

        let(:body) { sample_payload.except(:event_id) }

        run_test! do |res|
          expect(res.status).to eq(422)
          expect(
            SubmissionStatusEvent.where(
              application_id: permit_application.number
            )
          ).to be_empty
        end
      end

      response(401, "Missing or invalid API key") do
        schema "$ref" => "#/components/schemas/ResponseErrorDetailed"

        let(:Authorization) { nil }
        let(:body) { sample_payload }

        run_test! { |res| expect(res.status).to eq(401) }
      end

      response(
        429,
        "Rate limit exceeded. 100 requests per minute per API key, 300 per IP per 5 minutes."
      ) do
        schema "$ref" => "#/components/schemas/ResponseError"

        let(:body) { sample_payload }

        around do |example|
          with_temporary_rate_limit(
            "external_api/ip",
            limit: 3,
            period: 1.minute
          ) { example.run }
        end

        before do
          5.times do
            post "/external_api/v1/status_events",
                 params: sample_payload.to_json,
                 headers: {
                   "Authorization" => "Bearer #{token}",
                   "CONTENT_TYPE" => "application/json"
                 }
          end
        end

        run_test! { |res| expect(res.status).to eq(429) }
      end
    end
  end

  # Not part of the published contract, but load-bearing behaviour worth pinning.
  describe "ingest behaviour" do
    def post_event(payload)
      post "/external_api/v1/status_events",
           params: payload.to_json,
           headers: {
             "Authorization" => "Bearer #{token}",
             "CONTENT_TYPE" => "application/json"
           }
    end

    it "stores the payload verbatim, including fields we do not model" do
      payload = sample_payload(some_future_field: "surprise")
      post_event(payload)

      stored = recorded(payload[:event_id]).payload
      expect(stored["some_future_field"]).to eq("surprise")
      expect(stored["order_id"]).to be_present
      expect(stored["updated_by_user_id"]).to eq("0055f00000AbCdEfGHI")

      # ParamsWrapper re-inserts the whole body under the controller-derived key;
      # the payload must be the body as sent, not a copy of itself.
      expect(stored).not_to have_key("status_event")
    end

    # Pins the JSON::ParserError fallback in the controller, which looks like
    # deletable defensive code but is not: with a form-encoded body Rack still
    # fills params, while raw_post is "event_id=...&..." and fails JSON.parse.
    # Removing the rescue turns a routine client misconfiguration into a 500.
    it "accepts a form-encoded body rather than raising" do
      event_id = SecureRandom.uuid

      post "/external_api/v1/status_events",
           params: {
             event_id: event_id,
             event_type: "APPROVED",
             application_id: permit_application.number
           },
           headers: {
             "Authorization" => "Bearer #{token}"
           }

      expect(response).to have_http_status(:ok)

      stored = recorded(event_id).payload
      expect(stored["event_id"]).to eq(event_id)
      expect(stored["event_type"]).to eq("APPROVED")
      expect(stored).not_to have_key("status_event")
    end

    it "records which api key sent the event" do
      payload = sample_payload
      post_event(payload)

      expect(recorded(payload[:event_id]).external_api_key).to eq(
        external_api_key
      )
    end

    it "tells a batching client to send one event per request" do
      expect {
        post "/external_api/v1/status_events",
             params: [sample_payload, sample_payload].to_json,
             headers: {
               "Authorization" => "Bearer #{token}",
               "CONTENT_TYPE" => "application/json"
             }
      }.not_to change(SubmissionStatusEvent, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(
        JSON.parse(response.body).dig("meta", "message", "message")
      ).to include("one status event per request")
    end

    it "is idempotent on a replayed event_id" do
      payload = sample_payload
      post_event(payload)

      expect { post_event(payload) }.not_to change(
        SubmissionStatusEvent,
        :count
      )
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]["event_id"]).to eq(
        payload[:event_id]
      )
    end

    it "records an event whose application_id matches nothing" do
      payload = sample_payload(application_id: "999-999-999")

      expect { post_event(payload) }.to change(
        SubmissionStatusEvent,
        :count
      ).by(1)

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)["data"]
      expect(data["matched"]).to eq(false)

      # Echoed back on a miss so the sender can tell a field-mapping mistake
      # apart from a submission we genuinely do not have.
      expect(data["application_id"]).to eq("999-999-999")

      # The point of the application_id column: an unmatched event still records
      # what we were asked to find, so it can be searched for later.
      event = recorded(payload[:event_id])
      expect(event.permit_application).to be_nil
      expect(event.application_id).to eq("999-999-999")
    end

    it "does not match a submission belonging to another program" do
      # An explicit number, because assign_unique_number restarts at 000-000-001
      # per program - both programs' first submission would otherwise share a
      # number and this would assert nothing.
      other = create(:permit_application, number: "888-888-888")
      payload = sample_payload(application_id: other.number)

      post_event(payload)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]["matched"]).to eq(false)
      expect(recorded(payload[:event_id]).permit_application).to be_nil
    end
  end
end
