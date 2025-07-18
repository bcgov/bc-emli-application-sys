class NotificationService
  def self.reset_user_feed_last_read(user_id)
    mf = SimpleFeed.user_feed.activity(user_id)
    mf.reset_last_read
  end

  def self.total_page_count(total_count)
    page_size = (ENV["NOTIFICATION_FEED_PER_PAGE"] || 50).to_i
    (total_count.to_f / page_size).ceil
  end

  def self.user_feed_for(user_id, page)
    uf = SimpleFeed.user_feed.activity(user_id)
    user_feed_items = uf.paginate(page: page.to_i || 1, reset_last_read: false)

    feed_items =
      user_feed_items
        .map do |f|
          begin
            parsed_data = JSON.parse(f.value, symbolize_names: true)
            OpenStruct.new(parsed_data.merge({ at: f.at }))
          rescue JSON::ParserError => e
            Rails.logger.error "Failed to parse notification JSON: #{e.message}"
            nil
          end
        end
        .compact

    total_count = activity_metadata(user_id, uf, :total_count)

    {
      feed_items: feed_items,
      feed_object: uf,
      total_pages: total_page_count(total_count),
      total_count: total_count,
      unread_count: activity_metadata(user_id, uf, :unread_count)
    }
  end

  def self.publish_to_user_feeds(notification_user_hash)
    # Please provide a notification_user_hash where the keys are the users to send to
    # and the values are the user specific notification data

    user_ids_to_publish_to = notification_user_hash.keys

    # send this to the redis store
    # push to specific users
    # we need to calculate page metadata for each user individually
    payloads = {}
    user_ids_to_publish_to.each do |user_id|
      # Create a new event for each user with their respective notification_data
      event =
        SimpleFeed::Event.new(notification_user_hash[user_id].to_json, Time.now)

      # Get the user's feed and store the event
      activity = SimpleFeed.user_feed.activity(user_id)
      activity.store(event: event)

      payloads[user_id] = {
        domain: Constants::Websockets::Events::Notification::DOMAIN,
        event_type: Constants::Websockets::Events::Notification::TYPES[:update],
        data: notification_user_hash[user_id],
        meta: {
          total_pages:
            total_page_count(
              # The result type may be a number or a hash of numbers depending on the number of users being notified
              activity_metadata(user_id, activity, :total_count)
            ),
          unread_count: activity_metadata(user_id, activity, :unread_count),
          last_read_at: activity_metadata(user_id, activity, :last_read)
        }
      }
    end

    WebsocketBroadcaster.push_user_payloads(payloads)
  end

  def self.publish_new_template_version_publish_event(template_version)
    manager_ids =
      User
        .joins(:preference)
        .where(role: %i[review_manager regional_review_manager])
        .where(
          users: {
            preferences: {
              enable_in_app_new_template_version_publish_notification: true
            }
          }
        )
        .pluck(:id)

    relevant_permit_applications =
      PermitApplication
        .select("DISTINCT ON (submitter_id) permit_applications.*")
        .joins(:template_version)
        .joins(submitter: :preference)
        .where(
          template_versions: {
            requirement_template_id: template_version.requirement_template_id
          },
          status: PermitApplication.draft_statuses,
          users: {
            preferences: {
              enable_in_app_new_template_version_publish_notification: true
            }
          }
        )
        .order("submitter_id, updated_at DESC")

    notification_submitter_hash =
      relevant_permit_applications.each_with_object(
        {}
      ) do |permit_application, hash|
        submitter_id = permit_application.submitter_id
        hash[submitter_id] = template_version.publish_event_notification_data(
          permit_application
        )
      end

    notification_manager_hash =
      manager_ids.each_with_object({}) do |manager_id, hash|
        hash[manager_id] = template_version.publish_event_notification_data
      end

    NotificationPushJob.perform_async(
      { **notification_manager_hash, **notification_submitter_hash }
    )
  end

  def self.publish_missing_requirements_mapping_event(integration_mapping)
    unless integration_mapping.present? &&
             integration_mapping.can_send_template_missing_requirements_communication?
      return
    end

    user_ids_to_notify =
      integration_mapping
        .jurisdiction
        .users
        .includes(:preference)
        &.kept
        &.where(
          role: %i[review_manager regional_review_manager],
          preferences: {
            enable_in_app_integration_mapping_notification: true
          }
        )
        &.pluck(:id) || []

    notification_hash =
      user_ids_to_notify.each_with_object({}) do |user_id, hash|
        hash[
          user_id
        ] = integration_mapping.template_missing_requirements_mapping_event_notification_data if integration_mapping.template_missing_requirements_mapping_event_notification_data.present?
      end

    NotificationPushJob.perform_async(notification_hash)
  end

  def self.publish_customization_update_event(customization)
    template_version = customization.template_version
    relevant_submitter_ids =
      PermitApplication
        .joins(:template_version)
        .joins(submitter: :preference)
        .where(
          template_versions: {
            requirement_template_id: template_version.requirement_template_id
          },
          status: PermitApplication.draft_statuses,
          users: {
            preferences: {
              enable_in_app_customization_update_notification: true
            }
          }
        )
        .pluck(:submitter_id)
        .uniq

    notification_user_hash =
      relevant_submitter_ids.each_with_object({}) do |submitter_id, hash|
        hash[submitter_id] = customization.update_event_notification_data
      end

    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.publish_permit_collaboration_assignment_event(permit_collaboration)
    collaborator_user_id = permit_collaboration.collaborator.user_id

    notification_user_hash = {
      collaborator_user_id =>
        permit_collaboration.collaboration_assignment_notification_data
    }

    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.publish_permit_collaboration_unassignment_event(permit_collaboration)
    collaborator_user_id = permit_collaboration.collaborator.user_id

    notification_user_hash = {
      collaborator_user_id =>
        permit_collaboration.collaboration_unassignment_notification_data
    }

    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.publish_permit_block_status_ready_event(permit_block_status)
    unless permit_block_status.ready? && permit_block_status.block_exists?
      return
    end

    notification_user_hash = {}

    permit_block_status.users_to_notify_status_ready.each do |user|
      next unless user.preference&.enable_in_app_collaboration_notification

      notification_user_hash[
        user.id
      ] = permit_block_status.status_ready_notification_data
    end

    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.publish_application_submission_event(permit_application)
    notification_user_hash = {}

    users_that_can_submit = [permit_application.submitter]

    designated_submitter_user =
      permit_application.users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :delegatee
      ).first
    assignee_users =
      permit_application.users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :assignee
      )

    if designated_submitter_user.present?
      users_that_can_submit << designated_submitter_user
    end

    users_that_can_submit.each do |user|
      if user.preference&.enable_in_app_application_submission_notification
        notification_user_hash[
          user.id
        ] = permit_application.submit_event_notification_data
      end

      if user.preference&.enable_email_application_submission_notification
        PermitHubMailer.notify_submitter_application_submitted(
          permit_application,
          user
        )&.deliver_later
      end
    end

    # assignees to be notified
    assignee_users.each do |user|
      # skip the designated submitter as they have already been added and use a different preference settings
      next if user.id == designated_submitter_user&.id

      if user.preference&.enable_in_app_collaboration_notification
        notification_user_hash[
          user.id
        ] = permit_application.submit_event_notification_data
      end

      if user.preference&.enable_email_collaboration_notification
        PermitHubMailer.notify_submitter_application_submitted(
          permit_application,
          user
        )&.deliver_later
      end
    end

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_application_revisions_request_event(permit_application)
    notification_user_hash = {}

    users_that_can_submit = [permit_application.submitter]

    designated_submitter_user =
      permit_application.users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :delegatee
      ).first

    if designated_submitter_user.present?
      users_that_can_submit << designated_submitter_user
    end

    users_that_can_submit.each do |user|
      if user.preference&.enable_in_app_application_revisions_request_notification
        notification_user_hash[
          user.id
        ] = permit_application.revisions_request_event_notification_data
      end

      if user.preference&.enable_email_application_revisions_request_notification
        PermitHubMailer.notify_application_revisions_requested(
          permit_application,
          user
        )&.deliver_later
      end
    end

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_application_view_event(permit_application)
    # Temporarily disabled - view notifications
    return

    notification_user_hash = {}
    notification_user_hash[
      permit_application.submitter_id
    ] = permit_application.application_view_event_notification_data
    preference = permit_application.submitter.preference
    if preference.enable_email_application_view_notification
      PermitHubMailer.notify_application_viewed(
        permit_application
      )&.deliver_later
    end
    if preference.enable_in_app_application_view_notification
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_application_ineligible_event(permit_application)
    notification_user_hash = {
      permit_application.submitter_id =>
        permit_application.ineligible_event_notification_data
    }

    PermitHubMailer.notify_application_ineligible(
      permit_application
    )&.deliver_later

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_application_withdrawal_event_with_data(
    user_id,
    withdrawal_notification_data
  )
    notification_user_hash = { user_id => withdrawal_notification_data }
    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.delete_user_notification(user_id, notification_id)
    activity = SimpleFeed.user_feed.activity(user_id)
    all_notifications =
      activity.paginate(page: 1, per_page: 1000, reset_last_read: false)

    notification_to_delete =
      all_notifications.find do |notification|
        begin
          parsed_data = JSON.parse(notification.value, symbolize_names: true)
          parsed_data[:id] == notification_id
        rescue JSON::ParserError
          false
        end
      end

    if notification_to_delete
      activity.delete(value: notification_to_delete.value)
      { success: true }
    else
      { success: false, error: "Notification not found" }
    end
  rescue StandardError => e
    Rails.logger.error "Failed to delete notification #{notification_id} for user #{user_id}: #{e.message}"
    { success: false, error: e.message }
  end

  def self.clear_all_user_notifications(user_id)
    activity = SimpleFeed.user_feed.activity(user_id)
    activity.wipe
    activity.reset_last_read
    { success: true }
  rescue StandardError => e
    Rails.logger.error "Failed to clear all notifications for user #{user_id}: #{e.message}"
    { success: false, error: e.message }
  end

  def self.publish_account_update_event(user, changed_fields = [])
    notification_user_hash = {
      user.id => user.account_update_notification_data(changed_fields)
    }

    NotificationPushJob.perform_async(notification_user_hash)
  end

  def self.publish_new_submission_received_event(permit_application)
    # Only notify admin and admin_manager users who have access to this specific program
    admin_users =
      User
        .where(role: %i[admin admin_manager])
        .kept
        .joins(:program_memberships)
        .where(
          program_memberships: {
            program_id: permit_application.program_id,
            deactivated_at: nil
          }
        )
        .distinct

    notification_user_hash = {}

    admin_users.each do |user|
      # Send in-app notification to admin users for new submissions
      notification_user_hash[
        user.id
      ] = permit_application.new_submission_received_event_notification_data
    end

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_template_published_event(template_version)
    # Only notify admin and admin_manager users who have access to this specific program
    admin_users =
      User
        .where(role: %i[admin admin_manager])
        .kept
        .joins(:program_memberships)
        .where(
          program_memberships: {
            program_id: template_version.requirement_template.program_id,
            deactivated_at: nil
          }
        )
        .distinct

    notification_user_hash = {}

    admin_users.each do |user|
      notification_user_hash[
        user.id
      ] = template_version.template_published_notification_data
    end

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_application_assignment_event(
    permit_application,
    assigned_user
  )
    notification_user_hash = {
      assigned_user.id =>
        permit_application.application_assignment_event_notification_data
    }

    # Send in-app notification only (no email required)
    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  def self.publish_admin_updated_participant_app_event(permit_application)
    # Only send email to the participant's email address (no in-app notification)
    # since there's no link between the application and a user in the user table
    participant_email = permit_application.extract_email_from_submission_data

    if participant_email.present?
      PermitHubMailer.notify_admin_updated_participant_app(
        permit_application,
        participant_email
      )&.deliver_later
    end
  end

  def self.publish_participant_incomplete_draft_notification_event(
    permit_application
  )
    notification_user_hash = {
      permit_application.submitter_id =>
        permit_application.participant_incomplete_draft_notification_event_notification_data
    }

    PermitHubMailer.notify_participant_incomplete_draft_notification(
      permit_application
    )&.deliver_later

    unless notification_user_hash.empty?
      NotificationPushJob.perform_async(notification_user_hash)
    end
  end

  # this is just a wrapper around the activity's metadata methods
  # since in the case of a single instance it returns a specific return type (eg. Integer)
  # but in the case of multiple user_ids the activity is a hash object
  private_class_method def self.activity_metadata(user_id, activity_obj, method)
    metadata = activity_obj.send(method)
    metadata.is_a?(Hash) ? metadata[user_id] : metadata
  end
end
