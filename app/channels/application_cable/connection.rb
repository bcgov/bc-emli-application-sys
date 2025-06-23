require "jwt"

Rails.logger.info "[STARTUP DEBUG] ApplicationCable::Connection loaded at #{Time.now}"

module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      Rails.logger.info "[WebSocket Connection] ApplicationCable::Connection#connect called"
      self.current_user = find_verified_user
      Rails.logger.info "[WebSocket Connection] Connection established successfully"
    end

    private

    def find_verified_user
      Rails.logger.info "[WebSocket Connection] Starting WebSocket authentication"
      Rails.logger.info "[WebSocket Connection] Request params: #{request.params.keys}"
      Rails.logger.info "[WebSocket Connection] Query string: #{request.query_string}"

      # Extract JWT token from connection parameters (query string)
      # 'jid' is a legacy parameter name that may be used by older clients
      token = request.params["token"] || request.params["jid"]

      # If token not found in params, parse it from query string manually
      if token.blank? && request.query_string.present?
        Rails.logger.info "[WebSocket Connection] Token not found in params, parsing from query string"
        query_params = Rack::Utils.parse_query(request.query_string)
        token = query_params["token"] || query_params["jid"]
        Rails.logger.info "[WebSocket Connection] Parsed token from query string: #{token.present?}"
      end

      Rails.logger.info "[WebSocket Connection] Token present: #{token.present?}"
      Rails.logger.info "[WebSocket Connection] Token length: #{token&.length}"
      Rails.logger.info "[WebSocket Connection] Token (first 20 chars): #{token&.first(20)}"

      if Rails.env.development?
        Rails.logger.info "WebSocket connection attempt with a token received."
      end

      if token.blank?
        Rails.logger.warn "[WebSocket Connection] No JWT token provided in WebSocket connection parameters"
        Rails.logger.warn "No JWT token provided in WebSocket connection parameters"
        # Provide more specific error message
        reject_unauthorized_connection
        return
      end

      # Decode JWT token manually since Warden may not be available in WebSocket context
      begin
        Rails.logger.info "[WebSocket Connection] Starting JWT decoding"

        secret = ENV["DEVISE_JWT_SECRET_KEY"]
        if secret.blank?
          Rails.logger.error "[WebSocket Connection] Missing DEVISE_JWT_SECRET_KEY environment variable"
          Rails.logger.error "Missing DEVISE_JWT_SECRET_KEY environment variable"
          reject_unauthorized_connection
          return
        end

        Rails.logger.info "[WebSocket Connection] JWT secret available, decoding token"

        decoded_token =
          JWT.decode(
            token,
            secret,
            true,
            { algorithm: "HS256", verify_expiration: true }
          )
        payload = decoded_token.first
        user_id = payload["sub"]

        Rails.logger.info "[WebSocket Connection] JWT decoded successfully, user_id: #{user_id}"

        verified_user = User.find(user_id) if user_id

        Rails.logger.info "[WebSocket Connection] User lookup result: #{verified_user ? "found" : "not found"}"

        if Rails.env.development? && verified_user
          Rails.logger.info "WebSocket authentication successful for user: #{verified_user.id}"
        end
      rescue JWT::DecodeError => e
        Rails.logger.error "[WebSocket Connection] JWT decode error: #{e.class}: #{e.message}"
        Rails.logger.error "JWT decode error: #{e.class}: #{e.message}"
        reject_unauthorized_connection
        return
      rescue => e
        Rails.logger.error "[WebSocket Connection] WebSocket authentication error: #{e.class}: #{e.message}"
        Rails.logger.error "[WebSocket Connection] Backtrace: #{e.backtrace&.first(3)}"
        Rails.logger.error "WebSocket authentication error: #{e.class}: #{e.message}"
        reject_unauthorized_connection
        return
      end

      if verified_user.blank?
        Rails.logger.warn "[WebSocket Connection] Invalid JWT token provided in WebSocket connection"
        Rails.logger.warn "Invalid JWT token provided in WebSocket connection"
        reject_unauthorized_connection
      else
        Rails.logger.info "[WebSocket Connection] WebSocket authentication successful for user: #{verified_user.id}"
        verified_user
      end
    end
  end
end
