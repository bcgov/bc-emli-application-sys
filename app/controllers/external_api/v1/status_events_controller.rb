class ExternalApi::V1::StatusEventsController < ExternalApi::ApplicationController
  before_action :ensure_external_api_key_authorized!

  # Ingest only. Records what was sent and returns; it must never change
  # submission status - a separate processor does that from these rows. Only
  # event_id is required, because this phase exists to capture what actually
  # arrives, including fields the published schema did not mention.
  def create
    # Checked against the parsed body, not params[:_json] - Rails wraps a
    # top-level array under that key, but "_json" is also a legal field name in
    # an ordinary object, and we deliberately accept fields we do not model.
    if raw_payload.is_a?(Array)
      log_external_api_rejection(422, "array_payload")
      return render_error("misc.status_event_single_only", { status: 422 })
    end

    event_id = status_event_params[:event_id]
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
        application_id: status_event_params[:application_id],
        permit_application: matching_submission,
        external_api_key: current_external_api_key
      )

    render_event(event)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
    # Concurrent delivery of the same event. Which error surfaces is a timing
    # detail - the uniqueness validation's own SELECT raises RecordInvalid,
    # the unique index raises RecordNotUnique - and both mean somebody stored
    # it first. Re-raise if no row is there, so an unrelated validation failure
    # cannot become a silent 200.
    existing =
      SubmissionStatusEvent.find_by(event_id: status_event_params[:event_id])
    raise e if existing.blank?

    render_event(existing)
  end

  private

  # Only the fields this controller reads. The stored payload deliberately does
  # NOT come from here - see raw_payload.
  def status_event_params
    params.permit(:event_id, :application_id, :event_type, :record_type)
  end

  # The body verbatim. Not strong params (a permit-list would drop unanticipated
  # fields, which are the ones worth seeing) and not request_parameters
  # (ParamsWrapper re-inserts the whole body under a "status_event" key).
  #
  # The rescue is reachable, not padding: a form-encoded body still fills params
  # while raw_post is "event_id=...&...", which fails JSON.parse. Specced.
  def raw_payload
    JSON.parse(request.raw_post)
  rescue JSON::ParserError
    request.request_parameters
  end

  # Best-effort, never fatal - an unmatched event is still recorded. The request's
  # `application_id` holds our submission `number`. Scoping to the key's program
  # is also the access control: another program's number simply does not match.
  def matching_submission
    number = status_event_params[:application_id]
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
