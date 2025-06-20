class Api::SessionsController < Devise::SessionsController
  include BaseControllerMethods
  respond_to :json

  skip_before_action :verify_signed_out_user

  def destroy
    signed_out =
      (Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name))
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
    authenticate_user!
    if current_user
      # Generate JWT token for WebSocket authentication
      encoder = Warden::JWTAuth::UserEncoder.new
      result = encoder.call(current_user, :user, nil)
      # Handle the case where encoder returns [token, jti] tuple
      token = result.is_a?(Array) ? result.first : result

      render json: { token: token }, status: :ok
    else
      render json: { error: "Unauthorized" }, status: :unauthorized
    end
  end
end
