require "jwt"

module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = extract_token

      return reject_unauthorized_connection if token.blank?

      user = authenticate_user_from_token(token)

      if user
        if Rails.env.development?
          Rails.logger.info "[WebSocket] Authentication successful for user: #{user.id}"
        end
        user
      else
        reject_unauthorized_connection
      end
    end

    def extract_token
      # Check both 'token' and legacy 'jid' parameter
      token = request.params["token"] || request.params["jid"]

      # Fallback: parse from query string if not in params
      if token.blank? && request.query_string.present?
        query_params = Rack::Utils.parse_query(request.query_string)
        token = query_params["token"] || query_params["jid"]
      end

      token
    end

    def authenticate_user_from_token(token)
      secret = ENV["DEVISE_JWT_SECRET_KEY"]

      if secret.blank?
        Rails.logger.error "[WebSocket] Missing DEVISE_JWT_SECRET_KEY environment variable"
        return nil
      end

      decoded_token =
        JWT.decode(
          token,
          secret,
          true,
          {
            algorithm: "HS256",
            verify_expiration: true,
            verify_iat: true,
            verify_sub: true
          }
        )

      payload = decoded_token.first
      user_id = payload["sub"]

      User.find_by(id: user_id) if user_id
    rescue JWT::DecodeError, JWT::ExpiredSignature, JWT::InvalidSubError => e
      Rails.logger.warn "[WebSocket] JWT authentication failed: #{e.class}"
      nil
    rescue StandardError => e
      Rails.logger.error "[WebSocket] Unexpected authentication error: #{e.class}: #{e.message}"
      nil
    end
  end
end
