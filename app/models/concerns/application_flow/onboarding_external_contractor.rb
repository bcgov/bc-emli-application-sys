# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class OnboardingExternalContractor < Base
    aasm column: :status, enum: true, autosave: true do
      # --- States ---
      state :new_draft, initial: true
      state :newly_submitted
      state :training_pending
      state :approved
      state :ineligible

      # Override submit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end

      #additional state transitions based on figma workflow
      event :start_training do
        transitions from: :newly_submitted, to: :training_pending
      end

      event :approve do
        transitions from: :training_pending,
                    to: :approved,
                    after: :handle_onboarding
      end

      event :mark_ineligible do
        transitions from: %i[newly_submitted training_pending], to: :ineligible
      end
    end

    def approve!
      application.process_contractor_onboarding!
    end

    def handle_submission
      application.update(signed_off_at: Time.current)

      # Create submission version to capture application state at submission time
      application.submission_versions.create!(
        form_json: application.form_json,
        submission_data: application.submission_data
      )

      application.zip_and_upload_supporting_documents
      application.send_submit_notifications
    end
  end
end
