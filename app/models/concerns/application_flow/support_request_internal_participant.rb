# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class SupportRequestInternalParticipant < Base
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
      Rails.logger.info(
        "Application info: #{application.incoming_support_requests.first.parent_application_id}"
      )
      #TODO: define support request submission flow
      application.update(signed_off_at: Time.current)

      # TODO: need to call a function that 'moves' the submitted files from the linkedApplication to the parentApplication

      # NotificationService.participant_uploaded_supporting_files_event_notification_data(application)
    end
  end
end
