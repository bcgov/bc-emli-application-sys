# frozen_string_literal: true

# NOTE: Token-based authentication is used instead of Warden middleware
# See app/channels/application_cable/connection.rb for authentication logic
# and https://docs.anycable.io/rails/authentication for details

# In Openshift, we use HA-Redis with Sentinels, configuration is slightly different
if Rails.env.production? && ENV["IS_DOCKER_BUILD"].blank?
  AnyCable.configure do |config|
    config.redis_url =
      "redis://#{ENV["REDIS_SENTINEL_MASTER_SET_NAME"]}/#{ENV["ANYCABLE_REDIS_DB"]&.to_i || 1}"
    config.redis_sentinels =
      Resolv
        .getaddresses(ENV["REDIS_SENTINEL_HEADLESS"])
        .map do |address|
          { host: address, port: (ENV["REDIS_SENTINEL_PORT"]&.to_i || 26_379) }
        end
    # If needed, custom connection code here to explicitly set the role or other specific settings
  end
end

# Enable detailed logging for debugging WebSocket authentication issues
AnyCable.configure do |config|
  # Enable debug logging in all environments for troubleshooting
  config.debug = true
  config.log_level = :debug

  # Log all connection events
  Rails.logger.info "AnyCable configured with debug logging enabled"
end

# Add connection logging hooks
# Note: connection_factory is no longer configurable in AnyCable v1.4+
# Connection logging should be done within the connection class itself
