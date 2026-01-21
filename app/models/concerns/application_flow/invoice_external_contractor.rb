# app/models/concerns/application_flow/invoice_external_contractor.rb
module ApplicationFlow
  class InvoiceExternalContractor < Base
    aasm column: :status, enum: true, autosave: true do
      # --- States ---
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved_pending
      state :approved_paid
      state :ineligible

      # --- Events ---
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      application.update(signed_off_at: Time.current)

      # Create submission version to capture application state at submission time
      application.submission_versions.create!(
        form_json: application.form_json,
        submission_data: application.submission_data
      )

      application.zip_and_upload_supporting_documents
    end
  end
end
