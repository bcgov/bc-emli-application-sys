# app/models/concerns/application_flow/application_external_participant.rb
module ApplicationFlow
  class ApplicationExternalParticipant < Base
    aasm do
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
    end

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
            end
          )
      )

      application.zip_and_upload_supporting_documents
      application.send_submit_notifications
    end
  end
end
