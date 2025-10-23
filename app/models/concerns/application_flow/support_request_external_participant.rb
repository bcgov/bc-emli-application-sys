# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class SupportRequestExternalParticipant < Base
    aasm column: :status, enum: true, autosave: true do
      # sub-classed states
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
      state :ineligible

      # Overridden sumbit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      # we don't need to do anything else for this support request because it's for adding files
      # files added here are linked via the SupportRequest. Parent sees the linked_application supportDocuments.
      Rails.logger.info(
        "External participant support request submitted: #{application.inspect}"
      )
      application.update(signed_off_at: Time.current)

      support_request =
        SupportRequest.find_by(linked_application_id: application.id)

      if (support_request)
        parent_application_id = support_request.parent_application.id
        requested_by = support_request.requested_by
        parentApplication = PermitApplication.find(parent_application_id)

        NotificationService.publish_supporting_files_sumbitted_event(
          requested_by,
          parentApplication
        )
      end
    end
  end
end
