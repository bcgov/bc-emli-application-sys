# app/services/permit_application/status_event_processor.rb
class PermitApplication::StatusEventProcessor
  # Applies one staged SubmissionStatusEvent, using the same calls an admin's
  # button makes.
  #
  # Nothing retries and nothing reprocesses, so a `failed` row is terminal: the
  # submission keeps a status the sender believes it has moved on from until a
  # person reconciles it. That is why outcome_detail records the state at the
  # time - by the time anyone reads the row, the record has moved on.

  # (eventType, flow class) -> action. An absent key is `skipped`.
  #
  # Keyed on the flow class, not on eventType alone, because three flows define
  # `approve` with three different destinations. The table decides; the state
  # machine only gets to refuse.
  ACTIONS = {
    "Approved" => {
      ApplicationFlow::ApplicationExternalParticipant => :approve
      # Contractor invoice is absent deliberately. It *does* have an `approve`
      # event (-> approved_pending), so this is a refusal we enforce rather than
      # one the state machine makes for us: contractors get Approved-Pending, so
      # a bare Approved on an invoice means their record linkage is wrong.
    },
    "Approved-Pending" => {
      ApplicationFlow::InvoiceExternalContractor => :approve
    },
    "Approved-Paid" => {
      ApplicationFlow::InvoiceExternalContractor => :approve_paid
    },
    "Ineligible" => {
      ApplicationFlow::ApplicationExternalParticipant => :ineligible,
      ApplicationFlow::InvoiceExternalContractor => :ineligible
    },
    # We have no cancelled status. Empty rather than omitted so an unknown
    # eventType stays distinguishable from one we know and decline.
    "Cancelled" => {
    }
  }.freeze

  KNOWN_EVENT_TYPES = ACTIONS.keys.freeze

  def initialize(event)
    @event = event
  end

  def process!
    return @event if @event.processed_at.present?

    submission = @event.permit_application
    return finish("unmatched", unmatched_detail) if submission.nil?

    action = ACTIONS.dig(event_type, submission.flow.class)
    return finish("skipped", skipped_detail(submission)) if action.nil?

    # Savepoint: the caller holds a transaction open for the row lock, so a
    # raise part-way through apply would otherwise leave the status change
    # committed alongside an outcome of "failed". A failed row has to mean the
    # submission did not move.
    ActiveRecord::Base.transaction(requires_new: true) do
      apply(submission, action)
    end
    finish("applied", nil)
  rescue StandardError, NotImplementedError => e
    # Broad on purpose: nothing retries this, so an unrescued exception leaves
    # the row unstamped forever. NotImplementedError is named explicitly because
    # it descends from ScriptError, not StandardError - ApplicationFlow::Default
    # raises it, since it declares no AASM states. Specced.
    Rails.logger.error(
      "SubmissionStatusEvent #{@event.id} failed: #{e.class}: #{e.message}"
    )
    finish("failed", failure_detail(e))
  end

  private

  def event_type
    @event.payload.is_a?(Hash) ? @event.payload["eventType"] : nil
  end

  def event_notes
    @event.payload.is_a?(Hash) ? @event.payload["eventNotes"] : nil
  end

  def apply(submission, action)
    if action == :ineligible
      # Not an AASM event - a plain update, exactly what the admin ineligible
      # button does. It trips check_ineligible_transition and notifies, and it
      # has no state guard, so it is the one action that cannot be refused.
      return if submission.set_status(:ineligible, event_notes).present?

      raise "set_status(:ineligible) rejected: #{submission.errors.full_messages.to_sentence.presence || "no error recorded"}"
    end

    # Through `flow`, not the PermitApplication delegator: the delegator is
    # `flow.public_send(...) if flow.respond_to?(...)` and returns nil for an
    # event the flow does not define, so a wrong ACTIONS entry would record
    # `applied` for something that never happened. This raises instead.
    submission.flow.public_send("#{action}!")
  end

  # Reports the identifier that was actually used. A supplied guid is decisive,
  # so saying "neither matched" would be false - the number is not consulted.
  def unmatched_detail
    guid = @event.payload.is_a?(Hash) ? @event.payload["applicationGuid"] : nil
    if guid.present?
      "no submission matches applicationGuid=#{guid.inspect} " \
        "(applicationId not consulted)"
    else
      "no applicationGuid sent; no submission matches " \
        "applicationId=#{@event.submission_number.inspect}"
    end
  end

  def skipped_detail(submission)
    flow = submission.flow.class.name.demodulize
    if KNOWN_EVENT_TYPES.exclude?(event_type)
      "unknown eventType #{event_type.inspect}"
    else
      "#{event_type} is not applied to #{flow}"
    end
  end

  def failure_detail(error)
    # pick, not reload: this runs inside the rescue, and a reload would raise
    # on a deleted record or a failing connection - leaving the row unstamped,
    # which is the thing the rescue exists to prevent.
    status =
      PermitApplication.where(id: @event.permit_application_id).pick(:status)
    "#{event_type} failed at status=#{status.inspect}: #{error.class}: #{error.message}"
  end

  def finish(outcome, detail)
    @event.update!(
      processed_at: Time.current,
      outcome: outcome,
      outcome_detail: detail
    )
    @event
  end
end
