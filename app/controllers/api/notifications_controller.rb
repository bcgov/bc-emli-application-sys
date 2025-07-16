class Api::NotificationsController < Api::ApplicationController
  skip_after_action :verify_policy_scoped

  def index
    authorize :notification, :index?

    @notification_feed =
      NotificationService.user_feed_for(current_user.id, params[:page])
    nf = @notification_feed[:feed_object]
    render_success @notification_feed[:feed_items],
                   nil,
                   {
                     blueprint: NotificationBlueprint,
                     meta: {
                       total_pages: @notification_feed[:total_pages],
                       total_count: @notification_feed[:total_count],
                       unread_count: nf.unread_count,
                       last_read_at: nf.last_read
                     }
                   }
  end

  def reset_last_read
    authorize :notification, :reset_last_read?
    NotificationService.reset_user_feed_last_read(current_user.id)
    render_success nil, nil, { meta: { last_read_at: Time.now } }
  end

  def destroy
    authorize :notification, :destroy?
    result =
      NotificationService.delete_user_notification(current_user.id, params[:id])

    if result[:success]
      render_success nil, nil
    else
      render_error nil, nil, { error: result[:error] }
    end
  end

  def clear_all
    authorize :notification, :clear_all?
    NotificationService.clear_all_user_notifications(current_user.id)
    render_success nil, nil
  end
end
