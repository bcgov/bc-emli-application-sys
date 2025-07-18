class ParticipantIncompleteDraftNotificationJob
  include Sidekiq::Worker
  sidekiq_options queue: :default

  def perform(permit_application_id)
    permit_application = PermitApplication.find_by(id: permit_application_id)

    # Application no longer exists, skip notification
    return unless permit_application

    # Check if application is still in draft status
    # Only send notification if it's still in draft after 24 hours
    return unless permit_application.status == "new_draft"

    # Check if submitter still exists and is active
    return unless permit_application.submitter
    return if permit_application.submitter.discarded?

    # Send the notification
    NotificationService.publish_participant_incomplete_draft_notification_event(
      permit_application
    )
  end
end
