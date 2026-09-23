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
      # `ineligible` stays for the admin's pre-review screen-out - the one that
      # still notifies the applicant.
      state :declined

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
        transitions from: :in_review, to: :approved, after: :handle_approval
      end

      # handle_declined, NOT handle_ineligible_status - this deliberately does
      # not notify the applicant. The CRM is the only caller and has already told
      # them itself.
      event :reject do
        transitions from: :in_review, to: :declined, after: :handle_declined
      end
    end

    # --- Flow-specific handlers ---

    # persist_state writes the status with update_column, which skips callbacks -
    # so updated_at and the search index would both stay stale. touch covers both
    # and skips validations, so it cannot silently return false and leave the
    # index stale while the processor reports the approval as applied.
    def handle_approval
      application.touch
    end

    # Same reason as handle_approval, and nothing else: persist_state's
    # update_column leaves updated_at and the search index stale, so without this
    # a declined application still reads as in_review in every inbox and filter.
    def handle_declined
      application.touch
    end

    def handle_submission
      application.update(
        signed_off_at: Time.current,
        submitted_at: application.submitted_at || Time.current
      )

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

      application.generate_and_upload_pdfs
      application.send_submit_notifications
    end
  end
end
