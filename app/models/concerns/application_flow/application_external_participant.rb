module ApplicationFlow
  class ApplicationExternalParticipant < Base
    aasm column: :status, enum: true, autosave: true do
      # --- States ---
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
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
        transitions from: %i[newly_submitted resubmitted revisions_requested],
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
        transitions from: :newly_submitted, to: :in_review
      end

      event :approve do
        transitions from: :in_review, to: :approved
      end

      event :reject do
        transitions from: :in_review,
                    to: :ineligible,
                    after: :handle_ineligible_status
      end
    end

    # --- Flow-specific handlers ---
    def handle_submission
      application.update(signed_off_at: Time.current)

      checklist = application.step_code&.pre_construction_checklist
      application.submission_versions.create!(
        form_json: application.form_json,
        submission_data: application.submission_data,
        step_code_checklist_json:
          (
            if checklist.present?
              StepCodeChecklistBlueprint.render_as_hash(
                checklist,
                view: :extended
              )
            else
              nil
            end
          )
      )

      application.zip_and_upload_supporting_documents
      application.send_submit_notifications
    end
  end
end
