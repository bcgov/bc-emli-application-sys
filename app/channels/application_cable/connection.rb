module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      # Extract JWT token from connection parameters (query string)
      token = request.params["token"] || request.params["jid"]

      if Rails.env.development?
        if token
          logger.info "WebSocket connection attempt with token: #{token&.first(20)}..."
        end
      end

      if token.blank?
        logger.warn "No JWT token provided in WebSocket connection parameters"
        reject_unauthorized_connection
        return
      end

      # Decode JWT token manually since Warden may not be available in WebSocket context
      begin
        secret = ENV["DEVISE_JWT_SECRET_KEY"]
        decoded_token = JWT.decode(token, secret, true, { algorithm: "HS256" })
        payload = decoded_token.first
        user_id = payload["sub"]

        logger.info "Decoded JWT payload: #{payload}" if Rails.env.development?

        verified_user = User.find(user_id) if user_id

        if Rails.env.development? && verified_user
          logger.info "WebSocket authentication successful for user: #{verified_user.id}"
        end
      rescue JWT::DecodeError => e
        logger.error "JWT decode error: #{e.class}: #{e.message}"
        reject_unauthorized_connection
        return
      rescue => e
        logger.error "WebSocket authentication error: #{e.class}: #{e.message}"
        reject_unauthorized_connection
        return
      end

      if verified_user.blank?
        logger.warn "Invalid JWT token provided in WebSocket connection"
        reject_unauthorized_connection
      else
        verified_user
      end
    end
  end
end
