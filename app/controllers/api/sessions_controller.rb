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
    # Include entry_point from session, if set
    extra_meta = {}
    extra_meta[:entry_point] = session[:entry_point] if session[
      :entry_point
    ].present?

    render_success current_user,
                   nil,
                   { blueprint_opts: { view: :extended }, meta: extra_meta }
  end

  def websocket_token
    authenticate_user!
    begin
      encoder = Warden::JWTAuth::UserEncoder.new
      result = encoder.call(current_user, :user, nil)
      token = result.is_a?(Array) ? result.first : result
      render json: { token: token }, status: :ok
    rescue StandardError => e # More specific than bare rescue
      Rails.logger.error "[WebSocket Auth] Token generation failed: #{e.class}: #{e.message}"
      render json: {
               error: "Token generation failed"
             },
             status: :internal_server_error
    end
  end
end
