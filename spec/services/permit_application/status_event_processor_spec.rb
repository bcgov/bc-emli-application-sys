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

    it "applies Ineligible from in_review" do
      submission = participant(:in_review)
      event =
        process(
          event_for(
            submission,
            "Ineligible",
            "eventNotes" => "Income above threshold"
          )
        )

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("declined")
    end

    # By agreement: the integration spec defines eventNotes as free text shown
    # to the participant (Salesforce Rejected_Reasons__c, required for
    # INELIGIBLE). It renders on their page as "Ineligible reason".
    it "carries eventNotes through as the ineligible reason" do
      submission = participant(:in_review)

      process(
        event_for(
          submission,
          "Ineligible",
          "eventNotes" => "Income above threshold"
        )
      )

      expect(submission.reload.status_update_reason).to eq(
        "Income above threshold"
      )
    end

    # The sender decides this after review and emails the applicant itself, so
    # ours would be a second message about the same decision.
    it "does not notify the applicant when Ineligible arrives from the sender" do
      submission = participant(:in_review)

      expect(NotificationService).not_to receive(
        :publish_application_ineligible_event
      )

      event = process(event_for(submission, "Ineligible"))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("declined")
    end

    # The date the sender decided, not the date we received it. They diverge
    # whenever the sender batches or holds events.
    it "records decided_at from eventDatetime, not from now" do
      submission = participant(:in_review)
      sent = "2026-09-01T10:30:00.000Z"

      process(event_for(submission, "Ineligible", "eventDatetime" => sent))

      expect(submission.reload.decided_at).to eq(Time.zone.parse(sent))
    end

    it "records decided_at on an approval too" do
      submission = participant(:in_review)
      sent = "2026-09-02T08:00:00.000Z"

      process(event_for(submission, "Approved", "eventDatetime" => sent))

      expect(submission.reload.decided_at).to eq(Time.zone.parse(sent))
    end

    # Better no date than a wrong one - the timeline entry is conditional on it.
    # Time.zone.parse would invent one from several of these: "10:30" becomes
    # today and "Sept" becomes the 1st, both then shown to the participant as
    # the date they were declined.
    ["not a date", "10:30", "Sept", "2026-09-01", "", "5"].each do |bad|
      it "leaves decided_at nil when eventDatetime is #{bad.inspect}" do
        submission = participant(:in_review)

        event =
          process(event_for(submission, "Ineligible", "eventDatetime" => bad))

        expect(event.outcome).to eq("applied")
        expect(submission.reload.status).to eq("declined")
        expect(submission.decided_at).to be_nil
      end
    end

    # persist_state writes the status with update_column, which skips callbacks -
    # so without the after: hook the record is declined in the database and
    # still in_review in Elasticsearch, invisible to every inbox and filter.
    it "bumps updated_at so the search index is refreshed" do
      submission = participant(:in_review)
      before = submission.updated_at

      process(event_for(submission, "Ineligible"))

      expect(submission.reload.updated_at).to be > before
    end

    # The guard. Before this change set_status had none, so a decline applied
    # to anything - including an application nobody had reviewed.
    it "refuses Ineligible outside in_review" do
      submission = participant(:newly_submitted)

      event = process(event_for(submission, "Ineligible"))

      expect(event.outcome).to eq("failed")
      expect(event.outcome_detail).to include("AASM::InvalidTransition")
      expect(submission.reload.status).to eq("newly_submitted")
    end

    # The admin's pre-review path is untouched and still notifies.
    it "still notifies when an admin sets ineligible directly" do
      submission = participant(:newly_submitted)

      expect(NotificationService).to receive(
        :publish_application_ineligible_event
      ).once

      submission.set_status(:ineligible, "Did not qualify")

      expect(submission.reload.status).to eq("ineligible")
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

  # Contractor invoices are the only flow still routed through set_status, which
  # is a plain update returning nil on a validation failure rather than raising.
  # Without the explicit raise that silently records `applied` for a status that
  # never changed.
  it "records failed when set_status is rejected" do
    submission = contractor_invoice(:in_review)
    allow_any_instance_of(PermitApplication).to receive(:set_status).and_return(
      nil
    )

    event = process(event_for(submission, "Ineligible"))

    expect(event.outcome).to eq("failed")
    expect(event.outcome_detail).to include("set_status(:ineligible) rejected")
    expect(submission.reload.status).to eq("in_review")
  end

  describe "contractor invoices" do
    # decided_at drives the participant timeline's decision line, and that line
    # picks its wording off `status`. An invoice approval lands on
    # approved_pending, so a decided_at here would render the invoice as
    # declined. Invoices have no decision line - they must not get a date.
    it "does not record decided_at for an invoice approval" do
      submission = contractor_invoice(:in_review)

      event =
        process(
          event_for(
            submission,
            "Approved-Pending",
            "eventDatetime" => "2026-07-01T09:00:00.000Z"
          )
        )

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_pending")
      expect(submission.decided_at).to be_nil
    end

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
