class ExternalApi::V1::StatusEventsController < ExternalApi::ApplicationController
  before_action :ensure_external_api_key_authorized!

  # Ingest only: records what was sent and returns. It must never change
  # submission status - a separate processor does that from these rows.
  #
  # Only eventId is required, so a payload we do not recognise is still captured.
  # JSON fields are camelCase; our columns are snake_case.
  def create
    # From the parsed body, not params[:_json]: Rails wraps a top-level array
    # under that key, but "_json" is also a legal field name in an object.
    if raw_payload.is_a?(Array)
      log_external_api_rejection(422, "array_payload")
      return render_error("misc.status_event_single_only", { status: 422 })
    end

    event_id = payload_fields["eventId"]
    if event_id.blank?
      log_external_api_rejection(422, "missing_event_id")
      return render_error("misc.status_event_missing_event_id", { status: 422 })
    end

    existing = SubmissionStatusEvent.find_by(event_id: event_id)
    return render_event(existing) if existing.present?

    event =
      SubmissionStatusEvent.create!(
        event_id: event_id,
        payload: raw_payload,
        submission_number: payload_fields["applicationId"],
        permit_application: matching_submission,
        external_api_key: current_external_api_key
      )

    render_event(event)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
    # Concurrent delivery of the same event. Which error surfaces is timing - the
    # uniqueness validation's SELECT raises RecordInvalid, the unique index
    # raises RecordNotUnique - and both mean somebody stored it first. Re-raise
    # if no row is there, so an unrelated failure cannot become a silent 200.
    existing =
      SubmissionStatusEvent.find_by(event_id: payload_fields["eventId"])
    raise e if existing.blank?

    render_event(existing)
  end

  private

  # Identifiers come from the parsed body, not params, so the two cannot
  # disagree: params only sees fields Rails parsed for a registered JSON media
  # type, while raw_payload parses the body whatever the Content-Type says. A
  # valid JSON body sent as text/plain would otherwise be rejected for a missing
  # eventId it actually contains.
  def payload_fields
    raw_payload.is_a?(Hash) ? raw_payload : {}
  end

  # The body verbatim. Not strong params (a permit-list drops the unanticipated
  # fields worth seeing) and not request_parameters (ParamsWrapper re-inserts the
  # whole body under a "status_event" key). The rescue is reachable, not padding:
  # a form-encoded body fills params while raw_post is "eventId=...&...", which
  # fails JSON.parse. Specced.
  def raw_payload
    JSON.parse(request.raw_post)
  rescue JSON::ParserError
    request.request_parameters
  end

  # Best-effort, never fatal - an unmatched event is still recorded. applicationId
  # holds our submission `number`. Scoping to the key's program is also the access
  # control: another program's number simply does not match.
  def matching_submission
    number = payload_fields["applicationId"]
    return nil if number.blank?

    PermitApplication.for_sandbox(current_sandbox).find_by(
      program_id: current_external_api_key.program_id,
      number: number
    )
  end

  def render_event(event)
    render_success event,
                   nil,
                   {
                     blueprint: SubmissionStatusEventBlueprint,
                     blueprint_opts: {
                       view: :external_api
                     }
                   }
  end
end
