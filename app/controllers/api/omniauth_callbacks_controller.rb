class Api::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  include BaseControllerMethods

  def keycloak
    # Retrieve the entry point from the session
    entry_point = session[:entry_point] || ""
    #session.delete(:entry_point)

    origin_query =
      Rack::Utils.parse_nested_query(URI(request.env["omniauth.origin"]).query)
    result =
      OmniauthUserResolver.new(
        auth: request.env["omniauth.auth"],
        invitation_token: origin_query["invitation_token"],
        entry_point: entry_point
      ).call
    @user = result.user

    # Block deactivated contractors and their employees
    if @user&.contractor_access_blocked?
      flash_params =
        frontend_flash_message("contractor.errors.access_blocked", "error")
      redirect_to "/welcome/contractor?#{flash_params.to_query}"
      return
    end

    if @user&.valid? && @user&.persisted?
      sign_in(resource_name, @user, store: false)
      @user.reload # Get fresh data after sign_in

      # Create audit entry for successful GUI login
      begin
        AuditLog.create!(
          user: @user,
          action: "login",
          table_name: "users",
          data_after: {
            user_id: @user.id,
            email: @user.email,
            ip_address: request.remote_ip,
            user_agent: request.user_agent,
            sign_in_count: @user.sign_in_count
          }
        )
      rescue => e
        Rails.logger.error "Login audit failed: #{e.message}"
      end
      request.reset_csrf_token # explicitly reset the CSRF token here for CSRF Fixation protection (we are not using Devise's config.clean_up_csrf_token_on_authentication because it is causing issues)
      redirect_to root_path
    else
      redirect_to login_path(
                    frontend_flash_message(
                      result.error_key,
                      "error",
                      message_opts: {
                        error_message: @user&.errors&.full_messages&.join(",")
                      }
                    )
                  )
    end
  end

  def failure
    redirect_to login_path(frontend_flash_message("omniauth.failure", "error"))
  end
end
