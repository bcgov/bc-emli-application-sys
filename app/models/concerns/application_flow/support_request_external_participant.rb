# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class SupportRequestExternalParticipant < Base
    aasm column: :status, enum: true, autosave: true do
      # sub-classed states
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
      state :ineligible

      # Overridden sumbit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      # we don't need to do anything else for this support request because it's for adding files
      # files added here are linked via the SupportRequest. Parent sees the linked_application supportDocuments.

      application.update(signed_off_at: Time.current)
    end
  end
end
