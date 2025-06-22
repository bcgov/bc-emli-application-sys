class UserChannel < ApplicationCable::Channel
  def subscribed
    Rails.logger.info "[UserChannel] Subscription attempt for user: #{current_user&.id || "nil"}"

    if current_user.present?
      channel_name =
        "#{Constants::Websockets::Channels::USER_CHANNEL_PREFIX}-#{current_user.id}"
      Rails.logger.info "[UserChannel] Streaming from: #{channel_name}"
      stream_from channel_name
      Rails.logger.info "[UserChannel] Successfully subscribed user #{current_user.id} to #{channel_name}"
    else
      Rails.logger.error "[UserChannel] Subscription rejected - no current_user available"
      reject
    end
  end

  def unsubscribed
    Rails.logger.info "[UserChannel] User #{current_user&.id || "unknown"} unsubscribed from UserChannel"
    # Any cleanup needed when channel is unsubscribed
    stop_all_streams
  end
end
