class PermitHubMailer < ApplicationMailer
  # define instance variables that will be used in the view template
  def welcome(user)
    @user = user
    send_user_mail(email: user.email, template_key: "welcome")
  end

  def onboarding(user)
    @user = user
    send_user_mail(email: user.email, template_key: "onboarding")
  end

  def new_jurisdiction_membership(user, jurisdiction_id)
    @user = user
    @jurisdiction = Jurisdiction.find(jurisdiction_id)
    send_user_mail(
      email: user.email,
      template_key: "new_jurisdiction_membership"
    )
  end

  def notify_submitter_application_submitted(permit_application, user)
    @user = user
    @permit_application = permit_application

    send_user_mail(
      email: @user.email,
      template_key: "notify_submitter_application_submitted",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def notify_permit_collaboration(permit_collaboration:)
    @permit_collaboration = permit_collaboration
    @user = permit_collaboration.collaborator.user

    return unless permit_collaboration.permit_application

    send_user_mail(
      email: @user.email,
      template_key: :notify_permit_collaboration
    )
  end

  def notify_preview(early_access_preview:)
    @early_access_preview = early_access_preview
    @user = early_access_preview.previewer

    send_user_mail(email: @user.email, template_key: :notify_preview)
  end

  def notify_block_status_ready(permit_block_status:, user:, status_set_by: nil)
    @permit_block_status = permit_block_status
    @user = user
    @status_set_by = status_set_by

    unless permit_block_status.block_exists? &&
             @user.preference&.enable_email_collaboration_notification
      return
    end

    send_user_mail(email: @user.email, template_key: :notify_block_status_ready)
  end

  def notify_new_or_unconfirmed_permit_collaboration(
    permit_collaboration:,
    user:
  )
    @permit_collaboration = permit_collaboration
    @user = user

    return unless @permit_collaboration.permit_application

    if !@user.discarded? && @user.submitter?
      @user.skip_confirmation_notification!
      @user.skip_invitation = true
      @user.invite!(@permit_collaboration.collaborator.collaboratorable)
      @user.invitation_sent_at = Time.now

      @user.save!
    end

    send_mail(
      email: @user.email,
      template_key: :notify_new_or_unconfirmed_permit_collaboration
    )
  end

  def notify_new_or_unconfirmed_preview(early_access_preview:, user:)
    @early_access_preview = early_access_preview
    @user = user

    return unless @early_access_preview.early_access_requirement_template

    if !@user.discarded? && @user.submitter?
      @user.skip_confirmation_notification!
      @user.skip_invitation = true
      @user.invite!
      @user.invitation_sent_at = Time.now

      @user.save!
    end

    send_mail(
      email: @user.email,
      template_key: :notify_new_or_unconfirmed_preview
    )
  end

  def send_batched_integration_mapping_notifications(
    notifiable,
    notification_ids
  )
    # This should be called by the SendBatchedIntegrationMappingNotificationsJob

    @notifications = IntegrationMappingNotification.where(id: notification_ids)

    return unless @notifications.any?

    if notifiable.is_a?(User)
      @user = notifiable
      send_user_mail(
        email: notifiable.email,
        template_key: "notify_batched_integration_mapping"
      )
    elsif notifiable.is_a?(ExternalApiKey)
      @external_api_key = notifiable
      @jurisdiction_name = @external_api_key&.jurisdiction.qualified_name
      send_mail(
        email: notifiable.notification_email,
        template_key: "notify_batched_integration_mapping"
      )
    end
  end

  def notify_reviewer_application_received(
    permit_type_submission_contact,
    permit_application
  )
    @permit_application = permit_application
    send_mail(
      email: permit_type_submission_contact.email,
      template_key: "notify_reviewer_application_received",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def notify_application_viewed(permit_application)
    @user = permit_application.submitter
    @permit_application = permit_application
    send_user_mail(
      email: @user.email,
      template_key: "notify_application_viewed",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def notify_application_revisions_requested(permit_application, user)
    @user = user
    @permit_application = permit_application
    send_user_mail(
      email: @user.email,
      template_key: "notify_application_revisions_requested",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def remind_reviewer(permit_type_submission_contact, permit_applications)
    @permit_applications = permit_applications
    send_mail(
      email: permit_type_submission_contact.email,
      template_key: "remind_reviewer"
    )
  end

  def notify_application_withdrawn(application_number, user)
    @user = user
    @application_number = application_number

    send_user_mail(
      email: @user.email,
      template_key: "notify_application_withdrawn",
      subject_i18n_params: {
        permit_application_number: application_number
      }
    )
  end

  #### PermitTypeSubmission Contact Mailer
  def permit_type_submission_contact_confirm(permit_type_submission_contact)
    @permit_type_submission_contact = permit_type_submission_contact
    send_mail(
      email: permit_type_submission_contact.email,
      template_key: "permit_type_submission_contact_confirm"
    )
  end

  def send_user_mail(*args, **kwargs)
    return if @user.discarded? || !@user.confirmed?

    result = send_mail(*args, **kwargs)

    result
  end

  def notify_application_ineligible(permit_application)
    @user = permit_application.submitter
    @permit_application = permit_application
    @program = permit_application.program

    send_user_mail(
      email: @user.email,
      template_key: "notify_application_ineligible",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def notify_admin_updated_participant_app(
    permit_application,
    participant_email
  )
    @permit_application = permit_application
    @program = permit_application.program
    @participant_email = participant_email

    # Extract participant name from submission data
    name_data = permit_application.extract_participant_name_from_submission_data
    @participant_first_name = name_data[:first_name]
    @participant_last_name = name_data[:last_name]

    send_mail(
      email: participant_email,
      template_key: "notify_admin_updated_participant_app",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end

  def notify_participant_incomplete_draft_notification(permit_application)
    @user = permit_application.submitter
    @permit_application = permit_application
    @program = permit_application.program

    send_user_mail(
      email: @user.email,
      template_key: "notify_participant_incomplete_draft_notification",
      subject_i18n_params: {
        permit_application_number: permit_application.number
      }
    )
  end
end
