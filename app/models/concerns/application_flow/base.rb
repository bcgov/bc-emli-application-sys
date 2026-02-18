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

    # stub default states that may not be
    #  implemented by sub-classes
    def revisions_requested?
      false
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
      application
        .latest_submission_version
        .revision_requests
        .where(resolved_at: nil)
        .any?
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

    # Apply revision requests without changing state (for admin-on-behalf workflows)
    def apply_revision_requests_without_state_change!
      return false unless can_finalize_requests?

      application
        .latest_submission_version
        .revision_requests
        .where(resolved_at: nil)
        .update_all(resolved_at: Time.current)

      if application.status == "approved" &&
           application.submission_type&.code == "onboarding"
        sync_approved_contractor_data
      end

      true
    end

    # --- Abstract methods ---
    def handle_submission
      raise NotImplementedError,
            "#{self.class.name} must implement #handle_submission"
    end

    private

    # Sync submission_data to contractors table for approved contractors
    def sync_approved_contractor_data
      processor =
        PermitApplication::ContractorOnboardingProcessor.new(application)
      contractor = Contractor.find(application.submitter_id)
      processor.sync_to_contractor(contractor)
    end

    # need to gracefully handle predicates that don't exist
    #  this deals with noisy warnings in the log
    def respond_to_missing?(method_name, include_private = false)
      # respond to ?-style predicates even if not defined
      return true if method_name.to_s.end_with?("?")
      super
    end

    def method_missing(method_name, *args, &block)
      # if it's a missing predicate return false
      if method_name.to_s.end_with?("?")
        false
      else
        super
      end
    end
  end
end
