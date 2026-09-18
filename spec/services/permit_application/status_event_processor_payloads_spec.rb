require "rails_helper"

# Drives the processor with the payload shapes the sender actually emits, so a
# renamed field, a changed enum spelling, or a value arriving as null where we
# expected a string fails here rather than on a dev box weeks later.
#
# The fixtures (spec/fixtures/status_events.json) have every identifier replaced - the originals reference real
# submissions, and eligibilityCode embeds a guid prefix while sitting next to
# incomeBracket. Shape is the contract; identifiers never were.
#
# What they pin: paidDate / approvedDate arrive as explicit null rather than
# omitted; contractor events omit eligibilityCode and incomeBracket entirely;
# participant ineligible sends incomeBracket "N/A", never null; eventType and
# recordType are Title-Case and hyphenated.

RSpec.describe PermitApplication::StatusEventProcessor, "with real payloads" do
  let(:program) { create(:program) }

  def payloads
    @payloads ||=
      JSON.parse(Rails.root.join("spec/fixtures/status_events.json").read)
  end

  def payload(name)
    payloads.fetch(name)
  end

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

  # Re-points the sample at a submission we control, exactly as we do by hand
  # when replaying their traffic. Everything else is left verbatim.
  def staged(name, submission)
    body =
      payload(name).merge(
        "eventId" => SecureRandom.uuid,
        "applicationId" => submission.number,
        "applicationGuid" => submission.id
      )

    create(
      :submission_status_event,
      event_id: body["eventId"],
      payload: body,
      submission_number: submission.number,
      permit_application: submission
    )
  end

  def process(event)
    described_class.new(event).process!.reload
  end

  describe "participant" do
    it "applies participant-approved" do
      submission = participant(:in_review)
      event = process(staged("participant-approved", submission))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved")
    end

    it "applies participant-ineligible, taking eventNotes as the reason" do
      submission = participant(:in_review)
      event = process(staged("participant-ineligible", submission))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("ineligible")
      expect(submission.status_update_reason).to eq("Income too high")
    end
  end

  describe "contractor invoice" do
    it "walks in_review -> approved_pending -> approved_paid in order" do
      submission = contractor_invoice(:in_review)

      pending_event = process(staged("contractor-approved-pending", submission))
      expect(pending_event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_pending")

      paid_event = process(staged("contractor-approved-paid", submission))
      expect(paid_event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_paid")
    end

    # Pins the signature of the ordering race, so a real occurrence is
    # recognisable rather than mysterious.
    it "fails Approved-Paid that overtakes Approved-Pending" do
      submission = contractor_invoice(:in_review)
      event = process(staged("contractor-approved-paid", submission))

      expect(event.outcome).to eq("failed")
      expect(event.outcome_detail).to include('status="in_review"')
      expect(submission.reload.status).to eq("in_review")
    end

    it "applies contractor-ineligible" do
      submission = contractor_invoice(:in_review)
      event = process(staged("contractor-ineligible", submission))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("ineligible")
      expect(submission.status_update_reason).to eq("Ineligible reason")
    end

    # The contractor path with a real Contractor behind it. Without one,
    # Contractor.find_by(contact_id:) finds nothing and the notify method
    # returns at its own failsafe - so every other invoice example here proves
    # the transition, not the notification.
    it "notifies the contractor when an invoice is approved" do
      submission = contractor_invoice(:in_review)
      create(
        :contractor,
        contact_id: submission.submitter_id,
        business_name: "Test Contracting"
      )

      expect(NotificationService).to receive(
        :contractor_invoice_approved_event
      ).with(anything, submission.submitter, nil)

      process(staged("contractor-approved-pending", submission))
    end

    it "notifies the contractor when an invoice is marked paid" do
      submission = contractor_invoice(:approved_pending)
      create(:contractor, contact_id: submission.submitter_id)

      expect(NotificationService).to receive(
        :contractor_invoice_approve_paid_event
      ).with(anything, submission.submitter, nil)

      event = process(staged("contractor-approved-paid", submission))

      expect(event.outcome).to eq("applied")
      expect(submission.reload.status).to eq("approved_paid")
    end

    it "notifies the contractor when an invoice is marked ineligible" do
      submission = contractor_invoice(:in_review)
      create(:contractor, contact_id: submission.submitter_id)

      expect(NotificationService).to receive(
        :contractor_invoice_ineligible_event
      )

      process(staged("contractor-ineligible", submission))
    end

    it "records contractor-cancelled without touching status" do
      submission = contractor_invoice(:in_review)
      event = process(staged("contractor-cancelled", submission))

      expect(event.outcome).to eq("skipped")
      expect(submission.reload.status).to eq("in_review")
    end
  end

  # ApplicationFlow::Base#persist_state uses update_column, which skips
  # callbacks - and both applying paths depend on a hook firing: Ineligible on
  # the Rails after_update callback, contractor approval on an AASM after: hook.
  describe "notifications still fire when a machine drives the transition" do
    it "publishes the ineligible event via the after_update callback" do
      submission = participant(:in_review)

      expect(NotificationService).to receive(
        :publish_application_ineligible_event
      ).with(submission_matching(submission))

      process(staged("participant-ineligible", submission))
    end

    # On the hook rather than the notification: the factory's submitter is a
    # participant user, so no Contractor resolves and the notify method returns
    # at its own failsafe. Correct for this fixture - the question is only
    # whether AASM ran the hook.
    it "runs the contractor approval hook via the AASM after callback" do
      submission = contractor_invoice(:in_review)

      expect_any_instance_of(PermitApplication).to receive(
        :process_contractor_invoice_approved!
      )

      process(staged("contractor-approved-pending", submission))
    end

    def submission_matching(submission)
      satisfy { |arg| arg.id == submission.id }
    end
  end

  # A republished event arrives with a new eventId, so the unique index does
  # not fire. The state machine is what protects us: a second Approved is
  # refused, so the cost is a misleading `failed` row, never a wrong status.
  it "is safe against a republished duplicate carrying a fresh eventId" do
    submission = participant(:in_review)

    first = process(staged("participant-approved", submission))
    second = process(staged("participant-approved", submission))

    expect(first.outcome).to eq("applied")
    expect(second.outcome).to eq("failed")
    expect(second.outcome_detail).to include("AASM::InvalidTransition")
    expect(submission.reload.status).to eq("approved")
  end
end
