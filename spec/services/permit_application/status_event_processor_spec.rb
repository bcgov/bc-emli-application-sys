require "rails_helper"

# Applying a staged event to the submission it names. The transitions these
# examples assert were verified against the real state machines first.
RSpec.describe PermitApplication::StatusEventProcessor do
  let(:program) { create(:program) }

  def participant(status)
    create(:permit_application, program: program, status: status)
  end

  def contractor_invoice(status)
    create(
      :permit_application,
      program: program,
      status: status,
      submission_type:
        SubmissionType.find_or_create_by!(code: :invoice) do |s|
          s.name = "Invoice"
        end,
      user_group_type:
        UserGroupType.find_or_create_by!(code: :contractor) do |u|
          u.name = "Contractor"
        end
    )
  end

  def event_for(submission, event_type, overrides = {})
    create(
      :submission_status_event,
      permit_application: submission,
      submission_number: submission&.number,
      payload: {
        "eventId" => SecureRandom.uuid,
        "eventType" => event_type,
        "applicationId" => submission&.number
      }.merge(overrides)
    )
  end

  def process(event)
    described_class.new(event).process!.reload
  end

  describe "participant applications" do
    it "applies Approved from in_review" do
      submission = participant(:in_review)
      event = process(event_for(submission, "Approved"))

      expect(event.outcome).to eq("applied")
      expect(event.outcome_detail).to be_nil
      expect(event.processed_at).to be_present
      expect(submission.reload.status).to eq("approved")
    end

    it "fails Approved from a state it cannot leave, and says what the state was" do
      submission = participant(:revisions_requested)
      event = process(event_for(submission, "Approved"))

      expect(event.outcome).to eq("failed")
      expect(event.outcome_detail).to include('status="revisions_requested"')
      expect(event.outcome_detail).to include("AASM::InvalidTransition")
      expect(submission.reload.status).to eq("revisions_requested")
    end

    # `permit_application.approve_paid!` returns nil on this flow rather than
    # raising, so a call-and-rescue processor would record "applied" for an
    # event that did nothing. The mapping table has to refuse it instead.
    it "skips a contractor-only event type rather than silently doing nothing" do
      submission = participant(:in_review)
      event = process(event_for(submission, "Approved-Paid"))

      expect(event.outcome).to eq("skipped")
      expect(event.outcome_detail).to eq(
        "Approved-Paid is not applied to ApplicationExternalParticipant"
      )
      expect(submission.reload.status).to eq("in_review")
    end

    it "applies Ineligible from any state, carrying eventNotes as the reason" do
      submission = participant(:new_draft)
      event =
        process(
          event_for(
            submission,
            "Ineligible",
            "eventNotes" => "Income above threshold"
          )
        )

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("ineligible")
      expect(submission.status_update_reason).to eq("Income above threshold")
    end
  end

  # set_status is a plain update, so a validation failure returns nil rather
  # than raising. Without the explicit raise, that silently records `applied`
  # for a status that never changed.
  # A `failed` row has to mean the submission did not move. Without a savepoint
  # the status write commits alongside the failure, because the processor
  # swallows the exception inside the caller's transaction.
  it "rolls back the status change when a transition callback raises" do
    submission = participant(:in_review)
    allow_any_instance_of(
      ApplicationFlow::ApplicationExternalParticipant
    ).to receive(:handle_approval).and_raise("notification blew up")

    event =
      ActiveRecord::Base.transaction do
        process(event_for(submission, "Approved"))
      end

    expect(event.outcome).to eq("failed")
    expect(event.outcome_detail).to include("notification blew up")
    expect(submission.reload.status).to eq("in_review")
  end

  it "records failed when set_status is rejected" do
    submission = participant(:in_review)
    allow_any_instance_of(PermitApplication).to receive(:set_status).and_return(
      nil
    )

    event = process(event_for(submission, "Ineligible"))

    expect(event.outcome).to eq("failed")
    expect(event.outcome_detail).to include("set_status(:ineligible) rejected")
    expect(submission.reload.status).to eq("in_review")
  end

  describe "contractor invoices" do
    it "applies Approved-Pending from in_review" do
      submission = contractor_invoice(:in_review)
      event = process(event_for(submission, "Approved-Pending"))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_pending")
    end

    it "applies Approved-Paid from approved_pending" do
      submission = contractor_invoice(:approved_pending)
      event = process(event_for(submission, "Approved-Paid"))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_paid")
    end

    # This flow HAS an `approve` event - it goes to approved_pending, so
    # dispatching on eventType alone would approve the invoice here. If this
    # goes red, the processor has started acting on a message it does not
    # understand.
    it "refuses a bare Approved even though the flow could accept it" do
      submission = contractor_invoice(:in_review)
      event = process(event_for(submission, "Approved"))

      expect(event.outcome).to eq("skipped")
      expect(event.outcome_detail).to eq(
        "Approved is not applied to InvoiceExternalContractor"
      )
      expect(submission.reload.status).to eq("in_review")
    end
  end

  describe "events it will not apply" do
    it "records Cancelled without changing status" do
      submission = participant(:in_review)
      event = process(event_for(submission, "Cancelled"))

      expect(event.outcome).to eq("skipped")
      expect(event.outcome_detail).to eq(
        "Cancelled is not applied to ApplicationExternalParticipant"
      )
      expect(submission.reload.status).to eq("in_review")
    end

    it "distinguishes an unknown event type from one we decline" do
      submission = participant(:in_review)
      event = process(event_for(submission, "Rejected-Sideways"))

      expect(event.outcome).to eq("skipped")
      expect(event.outcome_detail).to eq(
        'unknown eventType "Rejected-Sideways"'
      )
    end

    it "marks an event with no submission unmatched, not failed" do
      event =
        create(
          :submission_status_event,
          permit_application: nil,
          submission_number: "999-999-999",
          payload: {
            "eventId" => SecureRandom.uuid,
            "eventType" => "Approved",
            "applicationId" => "999-999-999"
          }
        )

      processed = process(event)

      expect(processed.outcome).to eq("unmatched")
      expect(processed.outcome_detail).to include("999-999-999")
      expect(processed.processed_at).to be_present
    end
  end

  describe "stamping" do
    it "never reprocesses a row that already has an outcome" do
      submission = participant(:in_review)
      event = process(event_for(submission, "Approved"))
      first_stamp = event.processed_at

      # Put it back somewhere Approved would be refused; a second run must not
      # touch it at all, rather than overwriting "applied" with "failed".
      submission.update_column(:status, "revisions_requested")
      described_class.new(event).process!

      expect(event.reload.outcome).to eq("applied")
      expect(event.processed_at).to eq(first_stamp)
    end

    it "surfaces failed and unmatched, but not skipped, through needing_attention" do
      failed = process(event_for(participant(:revisions_requested), "Approved"))
      skipped = process(event_for(participant(:in_review), "Cancelled"))
      unmatched =
        process(
          create(
            :submission_status_event,
            permit_application: nil,
            submission_number: "999-999-998",
            payload: {
              "eventId" => SecureRandom.uuid,
              "eventType" => "Approved"
            }
          )
        )

      expect(SubmissionStatusEvent.needing_attention).to include(
        failed,
        unmatched
      )
      expect(SubmissionStatusEvent.needing_attention).not_to include(skipped)
    end
  end
end
