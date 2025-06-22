class Api::SessionsController < Devise::SessionsController
  include BaseControllerMethods
  respond_to :json

  skip_before_action :verify_signed_out_user

  def destroy
    Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name)
    render_success nil, "user.logout_success"
  end

  def validate_token
    authenticate_user!
    if current_user
      warden.authenticate({ scope: :user })
      Rails.logger.info "Session entry_point: #{session[:entry_point].inspect}"

      # Include entry_point from session, if set
      extra_meta = {}
      extra_meta[:entry_point] = session[:entry_point] if session[
        :entry_point
      ].present?

      render_success current_user,
                     nil,
                     { blueprint_opts: { view: :extended }, meta: extra_meta }
    else
      # clear the cookie so user can try and login again
      name, cookie = Devise::JWT::Cookie::CookieHelper.new.build(nil)
      Rack::Utils.set_cookie_header!(headers, name, cookie)
      render_error(nil, status: :unauthorized)
    end
  end

  def websocket_token
    Rails.logger.info "[WebSocket Auth] Starting websocket_token request"
    authenticate_user!
    Rails.logger.info "[WebSocket Auth] User authenticated: #{current_user&.id}"

    # Generate JWT token for WebSocket authentication
    begin
      encoder = Warden::JWTAuth::UserEncoder.new
      Rails.logger.info "[WebSocket Auth] Created JWT encoder"
      result = encoder.call(current_user, :user, nil)
      Rails.logger.info "[WebSocket Auth] Encoder result: #{result.class}"
      # Handle the case where encoder returns [token, jti] tuple
      token = result.is_a?(Array) ? result.first : result
      Rails.logger.info "[WebSocket Auth] Final token present: #{token.present?}"

      render json: { token: token }, status: :ok
    rescue => e
      Rails.logger.error "[WebSocket Auth] Error generating token: #{e.class}: #{e.message}"
      render json: {
               error: "Token generation failed"
             },
             status: :internal_server_error
    end
  end
end
