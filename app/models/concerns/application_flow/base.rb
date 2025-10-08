# app/models/concerns/application_flow/base.rb
module ApplicationFlow
  class Base
    include AASM

    attr_reader :application
    delegate :status,
             :status=,
             :update,
             :submission_versions,
             :submission_data,
             :step_code,
             to: :application

    def initialize(application)
      @application = application
    end

    # Shared statuses
    aasm column: "status", enum: true do
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
      state :ineligible

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

    # ===== Common Predicates =====
    def draft?
      new_draft? || revisions_requested?
    end

    def submitted?
      newly_submitted? || resubmitted?
    end

    def screen_in?
      in_review?
    end

    # ===== Common Guards =====
    def can_submit?
      signed =
        submission_data.dig("data", "section-completion-key", "signed").present?
      template_check =
        new_draft? ? application.using_current_template_version : true
      signed && template_check
    end

    def can_finalize_requests?
      application.latest_submission_version.revision_requests.any?
    end

    def was_originally_newly_submitted?
      application.submission_versions.count == 1
    end

    def was_originally_resubmitted?
      application.submission_versions.count > 1
    end

    # ===== Common Handlers =====
    def handle_finalize_revision_requests
      application.update(revisions_requested_at: Time.current)
      NotificationService.publish_application_revisions_request_event(
        application
      )
    end

    def handle_ineligible_status
      NotificationService.publish_application_ineligible_event(application)
    end

    # ===== Abstracted Methods =====

    def handle_submission
      raise NotImplementedError,
            "#{self.class.name} must implement #handle_submission"
    end
  end
end
