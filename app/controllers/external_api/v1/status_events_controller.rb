class ExternalApi::V1::StatusEventsController < ExternalApi::ApplicationController
  before_action :ensure_external_api_key_authorized!

  # Records what was sent, then applies it in the same request. The row is
  # written first and committed regardless, so a processing failure never costs
  # us the payload.
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

    event_id = scalar("eventId")
    if event_id.blank?
      log_external_api_rejection(422, "missing_event_id")
      return render_error("misc.status_event_missing_event_id", { status: 422 })
    end

    existing = SubmissionStatusEvent.find_by(event_id: event_id)
    if existing.present?
      return replay(existing) if own_event?(existing)
      return event_id_taken
    end

    event =
      SubmissionStatusEvent.create!(
        event_id: event_id,
        payload: raw_payload,
        submission_number: scalar("applicationId"),
        permit_application: matching_submission,
        external_api_key: current_external_api_key
      )

    process_event(event)

    render_event(event)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
    # Concurrent delivery of the same event. Which error surfaces is timing - the
    # uniqueness validation's SELECT raises RecordInvalid, the unique index
    # raises RecordNotUnique - and both mean somebody stored it first. Re-raise
    # if no row is there, so an unrelated failure cannot become a silent 200.
    existing = SubmissionStatusEvent.find_by(event_id: scalar("eventId"))
    raise e if existing.blank?

    # Same collision as the pre-insert check above, just lost the race to it -
    # so it gets the same answer, not a 500.
    return event_id_taken unless own_event?(existing)

    replay(existing)
  end

  private

  # A replay is the one natural retry we get. If the first request died between
  # the insert and the processing, the row is stranded - nothing sweeps it - so
  # process it now.
  def replay(event)
    process_event(event)
    render_event(event)
  end

  # Only this key's program may replay a stored event. event_id is unique
  # globally, so the lookup above has to be global too - which would otherwise
  # let one program hand another program's event back, and now process it.
  def event_id_taken
    log_external_api_rejection(422, "event_id_taken")
    render_error("misc.status_event_id_taken", { status: 422 })
  end

  def own_event?(event)
    event.external_api_key&.program_id == current_external_api_key.program_id
  end

  # Inline rather than on a queue: one human clicking a button, so there is no
  # load to absorb. Never fails the request - the processor records its own
  # failures on the row, and this rescue covers the row being unwritable, which
  # would turn an event we accepted into a 500.
  def process_event(event)
    # The lock covers first delivery and replay alike: a bare processed_at check
    # is check-then-act, and two deliveries could otherwise both apply the
    # transition. It rolls back on a crash, so the row stays retryable.
    event.with_lock do
      if event.processed_at.nil?
        PermitApplication::StatusEventProcessor.new(event).process!
      end
    end
  rescue StandardError => e
    Rails.logger.error(
      "SubmissionStatusEvent #{event.id} could not be processed: #{e.class}: #{e.message}"
    )
  end

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
    return @raw_payload if defined?(@raw_payload)

    @raw_payload =
      begin
        JSON.parse(request.raw_post)
      rescue JSON::ParserError
        request.request_parameters
      end
  end

  # Identifiers reach find_by, and a Hash there raises TypeError against a string
  # column - a 500 with nothing stored, on the endpoint whose whole point is that
  # a payload we do not understand is still captured.
  def scalar(key)
    value = payload_fields[key]
    value.is_a?(String) || value.is_a?(Numeric) ? value.to_s : nil
  end

  # Best-effort, never fatal - an unmatched event is still recorded.
  #
  # applicationGuid first, applicationId second. The guid is our own primary
  # key: immutable and never reissued. The number is not - assign_unique_number
  # takes max+1 within the program, so deleting the highest-numbered submission
  # hands that number to the next one created. A sender holding the old number
  # would then have its event applied to a different submission, matched: true,
  # with nothing to show anything went wrong. The unique index on
  # (program_id, number) prevents two live rows sharing a number; it does not
  # prevent a number being reused over time.
  #
  #
  # Both are scoped to the key's program, which is also the access control:
  # another program's submission is unreachable either way.
  #
  # When the two disagree, the guid wins and the discrepancy is already on the
  # row - submission_number holds what they sent, permit_application.number
  # holds what we found. No extra column needed to find them.
  #
  # for_sandbox matches the four other external endpoints that resolve a record.
  # No permit_application has a sandbox_id today, so it filters nothing - it is
  # here so all five call sites move together if sandbox is ever revived or
  # removed.
  def matching_submission
    # Decided on what they SENT, not on what survives coercion: a malformed guid
    # is still a guid they supplied, and must not fall through to the number.
    # That fallthrough is what makes cross-environment traffic dangerous - their
    # prod guid misses here, and their prod number can collide with a different
    # submission of ours, which would then be transitioned.
    if payload_fields["applicationGuid"].present?
      return in_program.find_by(id: scalar("applicationGuid"))
    end

    in_program.find_by(number: scalar("applicationId"))
  end

  def in_program
    PermitApplication.for_sandbox(current_sandbox).where(
      program_id: current_external_api_key.program_id
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
