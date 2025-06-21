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
    # Skip JWT processing for WebSocket connections
    websocket_request?(env) ? @app.call(env) : @jwt_middleware.call(env)
  end

  private

  def websocket_request?(env)
    # Check for WebSocket upgrade header or /cable path
    env["HTTP_UPGRADE"]&.downcase == "websocket" ||
      env["PATH_INFO"]&.start_with?("/cable")
  end
end

# Replace the default JWT middleware with our WebSocket-friendly version
Rails.application.config.middleware.swap Warden::JWTAuth::Middleware,
                 WebSocketFriendlyJWTAuth
