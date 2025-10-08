# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class OnboardingExternalContractor < Base
    aasm do
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
