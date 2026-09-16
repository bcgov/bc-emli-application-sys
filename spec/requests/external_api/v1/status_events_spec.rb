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

  # Shaped like the real payloads: camelCase fields, Title-Case enum values.
  def sample_payload(overrides = {})
    {
      eventId: SecureRandom.uuid,
      eventType: "Approved",
      eventDatetime: "2026-09-16T09:14:42.000Z",
      recordType: "Participant",
      applicationId: permit_application.number,
      applicationGuid: permit_application.id,
      eligibilityCode: "ESP3-NatGasbdbe80b0",
      incomeBracket: "ESP Level 3",
      approvedDate: "2026-09-16",
      eventNotes: nil,
      updatedBy: "005Hs00000ABCDEfGH"
    }.merge(overrides)
  end

  # Always look a row up by the event_id we sent. `SubmissionStatusEvent.last`
  # orders by a UUID primary key, so it is non-deterministic - and these specs run
  # against the development database, where unrelated rows already exist.
  def recorded(event_id)
    SubmissionStatusEvent.find_by!(event_id: event_id)
  end

  path "/status_events" do
    post "Records a single status event. A separate process applies it later, so 200 means recorded, not applied. One event per request; arrays are rejected. An applicationId matching no known submission is still recorded and still returns 200, with matched=false." do
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
        "Recorded. matched=true means it was linked to a submission; false means applicationId matched nothing and it was stored unlinked. Neither means the status change has been applied."
      ) do
        schema "$ref" => "#/components/schemas/StatusEventAck"

        let(:body) { sample_payload }

        run_test! do |res|
          data = JSON.parse(res.body)
          expect(data["data"]["eventId"]).to eq(body[:eventId])
          expect(data["data"]["matched"]).to eq(true)
          # Echoed only on a miss - on a match it would be noise.
          expect(data["data"]).not_to have_key("applicationId")

          event = recorded(body[:eventId])
          expect(event.permit_application).to eq(permit_application)
          expect(event.submission_number).to eq(permit_application.number)
          expect(event.processed_at).to be_nil
          expect(event.outcome).to be_nil
        end
      end

      response(
        422,
        "Rejected without being recorded - either eventId was missing, or a JSON array was sent. The meta.message says which."
      ) do
        schema "$ref" => "#/components/schemas/ResponseErrorDetailed"

        let(:body) { sample_payload.except(:eventId) }

        run_test! do |res|
          expect(res.status).to eq(422)
          # Scoped to this key, not to submission_number - numbers are only unique
          # within a program, and these specs run against the development
          # database where an unrelated row could match.
          expect(
            SubmissionStatusEvent.where(external_api_key: external_api_key)
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

      stored = recorded(payload[:eventId]).payload
      expect(stored["some_future_field"]).to eq("surprise")
      # applicationGuid is our permit_applications.id coming back - assert the
      # actual value, not just presence, since Phase 2 may resolve on it.
      expect(stored["applicationGuid"]).to eq(permit_application.id)
      expect(stored["updatedBy"]).to eq("005Hs00000ABCDEfGH")

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
             eventId: event_id,
             eventType: "Approved",
             applicationId: permit_application.number
           },
           headers: {
             "Authorization" => "Bearer #{token}"
           }

      expect(response).to have_http_status(:ok)

      stored = recorded(event_id).payload
      expect(stored["eventId"]).to eq(event_id)
      expect(stored["eventType"]).to eq("Approved")
      expect(stored).not_to have_key("status_event")
    end

    # "_json" is the key Rails wraps a top-level array under, but it is also a
    # legal field name. Detecting arrays from params would reject this.
    it "accepts an event whose payload contains a _json field" do
      payload = sample_payload("_json" => "a legal field name")

      expect { post_event(payload) }.to change(
        SubmissionStatusEvent,
        :count
      ).by(1)

      expect(response).to have_http_status(:ok)
      expect(recorded(payload[:eventId]).payload["_json"]).to eq(
        "a legal field name"
      )
    end

    # params only sees fields Rails parsed for a registered JSON media type;
    # raw_payload parses the body regardless. Reading identifiers from the body
    # keeps the two from disagreeing.
    it "accepts a valid JSON body sent with the wrong Content-Type" do
      event_id = SecureRandom.uuid

      post "/external_api/v1/status_events",
           params: {
             eventId: event_id,
             applicationId: permit_application.number
           }.to_json,
           headers: {
             "Authorization" => "Bearer #{token}",
             "CONTENT_TYPE" => "text/plain"
           }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]["matched"]).to eq(true)
      expect(recorded(event_id).submission_number).to eq(
        permit_application.number
      )
    end

    it "records which api key sent the event" do
      payload = sample_payload
      post_event(payload)

      expect(recorded(payload[:eventId]).external_api_key).to eq(
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

    it "is idempotent on a replayed eventId" do
      payload = sample_payload
      post_event(payload)

      expect { post_event(payload) }.not_to change(
        SubmissionStatusEvent,
        :count
      )
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]["eventId"]).to eq(
        payload[:eventId]
      )
    end

    it "records an event whose applicationId matches nothing" do
      payload = sample_payload(applicationId: "999-999-999")

      expect { post_event(payload) }.to change(
        SubmissionStatusEvent,
        :count
      ).by(1)

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)["data"]
      expect(data["matched"]).to eq(false)

      # Echoed back on a miss so the sender can tell a field-mapping mistake
      # apart from a submission we genuinely do not have.
      expect(data["applicationId"]).to eq("999-999-999")

      # The point of the submission_number column: an unmatched event still records
      # what we were asked to find, so it can be searched for later.
      event = recorded(payload[:eventId])
      expect(event.permit_application).to be_nil
      expect(event.submission_number).to eq("999-999-999")
    end

    it "does not match a submission belonging to another program" do
      # An explicit number, because assign_unique_number restarts at 000-000-001
      # per program - both programs' first submission would otherwise share a
      # number and this would assert nothing.
      other = create(:permit_application, number: "888-888-888")
      payload = sample_payload(applicationId: other.number)

      post_event(payload)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]["matched"]).to eq(false)
      expect(recorded(payload[:eventId]).permit_application).to be_nil
    end
  end
end
