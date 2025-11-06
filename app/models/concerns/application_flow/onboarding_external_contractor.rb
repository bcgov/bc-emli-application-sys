# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class OnboardingExternalContractor < Base
    aasm column: :status, enum: true, autosave: true do
      # --- States ---
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
      state :ineligible

      # Override submit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      # TODO:
      application.update(signed_off_at: Time.current)
    end
  end
end
