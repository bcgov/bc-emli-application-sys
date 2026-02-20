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
                    guard: :can_submit?,
                    after: :handle_submission

        transitions from: :revisions_requested,
                    to: :resubmitted,
                    guard: :can_submit?,
                    after: :handle_submission
      end

      event :finalize_revision_requests do
        transitions from: %i[
                      newly_submitted
                      resubmitted
                      in_review
                      revisions_requested
                    ],
                    to: :revisions_requested,
                    guard: :can_finalize_requests?,
                    after: :handle_finalize_revision_requests
      end

      event :cancel_revision_requests do
        transitions from: :revisions_requested,
                    to: :newly_submitted,
                    guard: :was_originally_newly_submitted?
        transitions from: :revisions_requested,
                    to: :resubmitted,
                    guard: :was_originally_resubmitted?
      end

      event :review do
        transitions from: %i[newly_submitted resubmitted], to: :in_review
      end

      event :approve do
        transitions from: :in_review,
                    to: :approved_pending,
                    after: :approve_invoice
      end

      event :approve_paid do
        transitions from: :approved_pending,
                    to: :approved_paid,
                    after: :mark_invoice_as_paid
      end

      event :reject do
        transitions from: :in_review,
                    to: :ineligible,
                    after: :handle_ineligible_status
      end
    end

    def approve_invoice
      application.update(approved_at: Time.current)
    end

    def mark_invoice_as_paid
      application.update(paid_at: Time.current)
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
