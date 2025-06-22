# frozen_string_literal: true

# Fix WebSocket "Nil JSON web token" error by skipping JWT middleware for /cable requests
# WebSocket authentication is handled manually in ApplicationCable::Connection

# Custom middleware that wraps Warden::JWTAuth::Middleware to skip WebSocket requests
class WebSocketFriendlyJWTAuth
  def initialize(app)
    @app = app
    @jwt_middleware = Warden::JWTAuth::Middleware.new(app)
  end

  def call(env)
    is_websocket = websocket_request?(env)

    # Add detailed logging for debugging
    if is_websocket
      Rails.logger.info "[WebSocket Middleware] Skipping JWT auth for WebSocket request: #{env["PATH_INFO"]}"
      Rails.logger.info "[WebSocket Middleware] HTTP_UPGRADE: #{env["HTTP_UPGRADE"]}"
      Rails.logger.info "[WebSocket Middleware] User-Agent: #{env["HTTP_USER_AGENT"]}"
      Rails.logger.info "[WebSocket Middleware] Request Method: #{env["REQUEST_METHOD"]}"
    end

    if is_websocket
      # Completely bypass Warden for WebSocket requests
      env["warden"] = nil
      Rails.logger.info "[WebSocket Middleware] Bypassing Warden, calling next app"
      @app.call(env)
    else
      @jwt_middleware.call(env)
    end
  end

  private

  def websocket_request?(env)
    # Check for WebSocket upgrade header or /cable path
    is_websocket_upgrade = env["HTTP_UPGRADE"]&.downcase == "websocket"
    is_cable_path = env["PATH_INFO"]&.start_with?("/cable")

    # Log detection details for debugging
    if is_cable_path || is_websocket_upgrade
      Rails.logger.info "[WebSocket Detection] PATH_INFO: #{env["PATH_INFO"]}"
      Rails.logger.info "[WebSocket Detection] HTTP_UPGRADE: #{env["HTTP_UPGRADE"]}"
      Rails.logger.info "[WebSocket Detection] Is cable path: #{is_cable_path}"
      Rails.logger.info "[WebSocket Detection] Is websocket upgrade: #{is_websocket_upgrade}"
    end

    is_websocket_upgrade || is_cable_path
  end
end

# Replace the default JWT middleware with our WebSocket-friendly version
Rails.application.config.middleware.swap Warden::JWTAuth::Middleware,
                 WebSocketFriendlyJWTAuth
