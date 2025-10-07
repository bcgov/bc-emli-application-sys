# app/models/concerns/application_flow/base.rb
module ApplicationFlow
  class Base
    include AASM

    attr_reader :permit_application

    def initialize(permit_application)
      @permit_application = permit_application
    end

    delegate_missing_to :permit_application

    aasm column: "status", enum: true, whiny_transitions: false do
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :update_needed
      state :approved
      state :ineligible

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
    end

    # Shared helpers
    def draft?
      new_draft? || revisions_requested?
    end

    def submitted?
      newly_submitted? || resubmitted?
    end

    def screen_in?
      in_review?
    end

    # Guards & callback helpers
    def can_submit?
      signed =
        submission_data.dig("data", "section-completion-key", "signed").present?
      # Template version policy:
      # - new_draft: Must use current template version (enforced)
      # - All other statuses (newly_submitted, revisions_requested, resubmitted, etc.):
      #   Can submit with their original template version (bypassed)
      template_check = new_draft? ? using_current_template_version : true
      signed && template_check
    end

    def can_finalize_requests?
      latest_submission_version.revision_requests.any?
    end

    def was_originally_newly_submitted?
      submission_versions.count == 1
    end

    def was_originally_resubmitted?
      submission_versions.count > 1
    end

    def handle_finalize_revision_requests
      update(revisions_requested_at: Time.current)
      NotificationService.publish_application_revisions_request_event(self)
    end

    def handle_submission
      update(signed_off_at: Time.current)

      checklist = step_code&.pre_construction_checklist

      submission_versions.create!(
        form_json: form_json,
        submission_data: submission_data,
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

      zip_and_upload_supporting_documents
      send_submit_notifications
    end

    def handle_ineligible_status
      NotificationService.publish_application_ineligible_event(self)
    end
  end
end
