class ApplicationAssignments::AssignmentManagementService
  attr_accessor :permit_application

  def initialize(permit_application)
    @permit_application = permit_application
  end

  def assign_user_to_application(user)
    ApplicationAssignment.transaction do
      ApplicationAssignment.where(
        permit_application_id: permit_application.id
      ).destroy_all
      ApplicationAssignment.create!(
        user_id: user.id,
        permit_application_id: permit_application.id
      )
    end
  end

  def remove_user_assignment(user)
    ApplicationAssignment.where(
      user_id: user.id,
      permit_application_id: permit_application.id
    ).destroy_all
  end

  # def send_collaboration_assignment_notification(permit_collaboration)
  #   NotificationService.publish_permit_collaboration_assignment_event(
  #     permit_collaboration
  #   )
  # end
end
