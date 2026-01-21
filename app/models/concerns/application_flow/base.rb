module ApplicationFlow
  class Base
    include AASM

    # every subclass' aasm neesd to save its final state
    aasm { after_all_transitions :persist_state }

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
      if application.status.present? &&
           aasm.states.map(&:name).include?(application.status.to_sym)
        aasm.current_state = application.status.to_sym
      end
    end

    # persistence wiring for aasm
    def aasm_read_attribute(name)
      application.public_send(name)
    end

    def aasm_write_attribute(name, value)
      application.public_send("#{name}=", value)
      application.save!
    end

    # persistence hook for all subclasses
    def persist_state
      new_state = aasm.to_state
      application.update_column(:status, new_state)
    end

    # --- Common predicates ---
    def draft?
      new_draft? || revisions_requested?
    end

    def submitted?
      newly_submitted? || resubmitted?
    end

    def screen_in?
      in_review?
    end

    def approved?
      approved? || approved_pending? || approved_paid?
    end

    # --- Common guards ---
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

    def reapproval_flow?
      aasm.from_state == :approved ||
        aasm.to_state == :approved && application.submission_versions.count > 1
    end

    # --- Common handlers ---
    def handle_finalize_revision_requests
      application.update(revisions_requested_at: Time.current)
      NotificationService.publish_application_revisions_request_event(
        application
      )
    end

    def handle_ineligible_status
      NotificationService.publish_application_ineligible_event(application)
    end

    # --- Abstract methods ---
    def handle_submission
      raise NotImplementedError,
            "#{self.class.name} must implement #handle_submission"
    end
  end
end
