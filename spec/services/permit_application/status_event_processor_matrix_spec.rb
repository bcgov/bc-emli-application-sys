require "rails_helper"

# Exhaustive sweep of the ACTIONS table: every event type against every state of
# every flow it reaches, plus the flows it deliberately does not handle.
#
# Expectations are written out by hand rather than derived from AASM - deriving
# them would only assert the implementation agrees with itself.
#
# One example per (flow, eventType) rather than per cell, since a per-cell
# example means ~75 factory builds. Failures aggregate, so a broken row reports
# every state it broke in.
RSpec.describe PermitApplication::StatusEventProcessor, "action matrix" do
  let(:program) { create(:program) }

  def submission_for(submission_code, group_code, audience_code = :external)
    create(
      :permit_application,
      program: program,
      submission_type:
        SubmissionType.find_or_create_by!(code: submission_code) do |s|
          s.name = submission_code.to_s.titleize
        end,
      user_group_type:
        UserGroupType.find_or_create_by!(code: group_code) do |u|
          u.name = group_code.to_s.titleize
        end,
      audience_type:
        AudienceType.find_or_create_by!(code: audience_code) do |a|
          a.name = audience_code.to_s.titleize
        end
    )
  end

  def process_event(submission, event_type)
    event =
      create(
        :submission_status_event,
        permit_application: submission,
        submission_number: submission.number,
        payload: {
          "eventId" => SecureRandom.uuid,
          "eventType" => event_type,
          "eventNotes" => "matrix",
          "applicationId" => submission.number
        }
      )
    described_class.new(event).process!.reload
  end

  # Drives one row of the matrix: an event type against every state of a flow.
  # `expectations` maps each state to [outcome, resulting status].
  def sweep(submission, event_type, expectations)
    aggregate_failures "#{event_type} across all states" do
      expectations.each do |from_state, (outcome, to_status)|
        submission.update_column(:status, from_state)
        submission.update_column(:status_update_reason, nil)
        submission.reload

        event = process_event(submission, event_type)

        expect(event.outcome).to eq(outcome),
        -> do
          "#{event_type} from #{from_state}: expected #{outcome}, got #{event.outcome} (#{event.outcome_detail})"
        end
        expect(submission.reload.status).to eq(to_status),
        -> do
          "#{event_type} from #{from_state}: expected status #{to_status}, got #{submission.status}"
        end
      end
    end
  end

  describe "ApplicationExternalParticipant" do
    let(:submission) { submission_for(:application, :participant) }
    let(:states) do
      %w[
        new_draft
        newly_submitted
        revisions_requested
        resubmitted
        in_review
        approved
        ineligible
      ]
    end

    # approve transitions from in_review only.
    it "Approved applies from in_review and fails everywhere else" do
      expectations =
        states
          .index_with { |s| ["failed", s] }
          .merge("in_review" => %w[applied approved])
      sweep(submission, "Approved", expectations)
    end

    # Not in ACTIONS for this flow. The flow has no approve_paid event at all,
    # so the delegator returns nil silently - a call-and-rescue processor would
    # record that as applied. The table is what refuses it.
    it "Approved-Pending is skipped from every state" do
      sweep(
        submission,
        "Approved-Pending",
        states.index_with { |s| ["skipped", s] }
      )
    end

    it "Approved-Paid is skipped from every state" do
      sweep(
        submission,
        "Approved-Paid",
        states.index_with { |s| ["skipped", s] }
      )
    end

    # set_status is not AASM - it has no guard, so it applies from anywhere,
    # including from approved. That matches the admin path, which has no guard
    # either (Api::PermitApplicationsController#change_status).
    it "Ineligible applies from every state, including approved" do
      sweep(
        submission,
        "Ineligible",
        states.index_with { %w[applied ineligible] }
      )
    end

    it "Cancelled is skipped from every state" do
      sweep(submission, "Cancelled", states.index_with { |s| ["skipped", s] })
    end
  end

  describe "InvoiceExternalContractor" do
    let(:submission) { submission_for(:invoice, :contractor) }
    let(:states) do
      %w[
        new_draft
        newly_submitted
        revisions_requested
        resubmitted
        in_review
        approved_pending
        approved_paid
        ineligible
      ]
    end

    # This flow HAS an approve event (-> approved_pending). It is skipped by
    # decision, not because the state machine refuses it.
    it "Approved is skipped from every state, though the flow could accept it" do
      sweep(submission, "Approved", states.index_with { |s| ["skipped", s] })
    end

    it "Approved-Pending applies from in_review and fails everywhere else" do
      expectations =
        states
          .index_with { |s| ["failed", s] }
          .merge("in_review" => %w[applied approved_pending])
      sweep(submission, "Approved-Pending", expectations)
    end

    it "Approved-Paid applies from approved_pending and fails everywhere else" do
      expectations =
        states
          .index_with { |s| ["failed", s] }
          .merge("approved_pending" => %w[applied approved_paid])
      sweep(submission, "Approved-Paid", expectations)
    end

    # Including from approved_paid: an Ineligible arriving after a payment
    # reverses it. Deliberate, and pinned so it cannot change silently.
    it "Ineligible applies from every state, including approved_paid" do
      sweep(
        submission,
        "Ineligible",
        states.index_with { %w[applied ineligible] }
      )
    end

    it "Cancelled is skipped from every state" do
      sweep(submission, "Cancelled", states.index_with { |s| ["skipped", s] })
    end
  end

  # The flows ACTIONS does not name. Not hypothetical - support requests and
  # onboarding forms outnumber participant applications in the environments we
  # have, so a mistyped applicationId is likelier to land here than anywhere.
  describe "flows the table does not handle" do
    {
      "SupportRequestExternalParticipant" => %i[
        support_request
        participant
        external
      ],
      "SupportRequestInternalParticipant" => %i[
        support_request
        participant
        internal
      ],
      "OnboardingExternalContractor" => %i[onboarding contractor external]
    }.each do |flow_name, (submission_code, group_code, audience_code)|
      it "skips every event type for #{flow_name}" do
        submission = submission_for(submission_code, group_code, audience_code)
        expect(submission.flow.class.name.demodulize).to eq(flow_name)

        original = submission.status

        aggregate_failures do
          PermitApplication::StatusEventProcessor::ACTIONS.each_key do |event_type|
            event = process_event(submission, event_type)

            expect(event.outcome).to eq("skipped"),
            -> do
              "#{flow_name} / #{event_type}: expected skipped, got #{event.outcome} (#{event.outcome_detail})"
            end
            expect(submission.reload.status).to eq(original)
          end
        end
      end
    end

    # ApplicationFlow::Default declares no AASM states, so #flow raises
    # NotImplementedError for any submission whose type triple is missing from
    # FLOW_MAP. Pre-existing and far wider than this feature - anything using
    # `delegate_missing_to :flow` breaks the same way - and no such record
    # exists today. What we owe is degrading rather than 500ing.
    it "records a failed row rather than raising when the flow is unusable" do
      submission = submission_for(:application, :contractor, :external)

      event = nil
      expect {
        event = process_event(submission, "Approved")
      }.not_to raise_error

      expect(event.outcome).to eq("failed")
      expect(event.outcome_detail).to include("NotImplementedError")
      expect(event.processed_at).to be_present
    end
  end
end
