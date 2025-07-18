class Api::UsersController < Api::ApplicationController
  include Api::Concerns::Search::AdminUsers

  before_action :find_user,
                only: %i[
                  destroy
                  restore
                  accept_eula
                  update
                  reinvite
                  accept_invitation
                  update_user_role
                ]
  skip_after_action :verify_policy_scoped, only: %i[index]
  skip_before_action :require_confirmation, only: %i[profile]
  skip_before_action :require_confirmation,
                     only: %i[accept_eula resend_confirmation]

  def index
    authorize :user, :index?
    perform_user_search
    authorized_results =
      apply_search_authorization(@user_search.results, "search_admin_users")

    render_success authorized_results,
                   nil,
                   {
                     meta: {
                       total_pages: @user_search.total_pages,
                       total_count: @user_search.total_count,
                       current_page: @user_search.current_page
                     },
                     blueprint: UserBlueprint,
                     blueprint_opts: {
                       view: :base
                     }
                   }
  end

  def super_admins
    authorize :user, :super_admins?
    begin
      super_admins = User.system_admin
      render_success super_admins,
                     nil,
                     {
                       blueprint: UserBlueprint,
                       blueprint_opts: {
                         view: :minimal
                       }
                     }
    rescue StandardError => e
      render_error "user.get_super_admins_error", {}, e and return
    end
  end

  def update
    authorize @user
    unless %w[reviewer review_manager admin_manager].include?(
             user_params[:role]
           )
      return render_error "misc.user_not_authorized_error"
    end

    # Rails.logger.info("Updating user: #{user_params}")

    if @user.update(user_params)
      render_success @user,
                     "user.update_success",
                     blueprint_opts: {
                       view: :base
                     }
    else
      render_error "user.update_error"
    end
  end

  def profile
    # Currently a user can only update themself
    @user = current_user
    authorize current_user

    # allow user to change back to original confirmed email
    # https://github.com/heartcombo/devise/issues/5470
    current_user.unconfirmed_email = nil if current_user.email &&
      profile_params[:email] == current_user.email

    if current_user.update(profile_params)
      should_send_confirmation =
        @user.confirmed_at.blank? && @user.confirmation_sent_at.blank?
      current_user.send_confirmation_instructions if should_send_confirmation

      # Send account update notification only if actual changes were made
      # Check for changes in user attributes or addresses
      changed_fields = []

      if current_user.saved_changes?
        # Check which user fields changed
        user_changes = current_user.saved_changes.keys
        changed_fields.concat(
          user_changes.select { |field| %w[email].include?(field) }
        )
      end

      if current_user.mailing_address&.saved_changes?
        changed_fields << "mailing_address"
      end

      if current_user.physical_address&.saved_changes?
        changed_fields << "physical_address"
      end

      unless changed_fields.empty?
        NotificationService.publish_account_update_event(
          current_user,
          changed_fields
        )
      end

      render_success(
        current_user,
        (
          if email_changed? || should_send_confirmation
            "user.confirmation_sent"
          else
            "user.update_success"
          end
        ),
        blueprint_opts: {
          view: :base
        }
      )
    else
      render_error "user.update_error",
                   {
                     message_opts: {
                       error_message:
                         current_user.errors.full_messages.join(", ")
                     }
                   }
    end
  end

  def license_agreements
    @user = current_user
    authorize current_user

    render_success @user,
                   nil,
                   {
                     blueprint: UserBlueprint,
                     blueprint_opts: {
                       view: :accepted_license_agreements
                     }
                   }
  end

  def destroy
    authorize @user
    if @user.discard
      message =
        if @user.invitation_accepted_at.nil?
          "user.invitation_removed_success" # Add this key to your locale file
        else
          "user.destroy_success"
        end

      render_success(@user, message, { blueprint_opts: { view: :base } })
    else
      render_error "user.destroy_error", {}
    end
  end

  def restore
    authorize @user
    if @user.update(discarded_at: nil)
      render_success(
        @user,
        "user.restore_success",
        blueprint_opts: {
          view: :base
        }
      )
    else
      render_error "user.restore_error", {}
    end
  end

  def accept_eula
    authorize @user
    @user.license_agreements.create!(
      accepted_at: Time.current,
      agreement: EndUserLicenseAgreement.active_agreement(@user.eula_variant)
    )
    render_success @user,
                   "user.terms_accepted",
                   { blueprint_opts: { view: :current_user } }
  end

  def accept_invitation
    authorize @user
    invited_user =
      User.find_by_invitation_token(params[:invitation_token], true)
    if @user.id != invited_user.id
      PromoteUser.new(existing_user: @user, invited_user:).call
      if !@user.valid?
        render_error "user.accept_invite_error",
                     {
                       message_opts: {
                         error_message: @user.errors.full_messages.join(", ")
                       }
                     } and return
      end
    else
      @user.accept_invitation!
    end

    render_success @user,
                   "user.invitation_accepted",
                   { blueprint_opts: { view: :extended } }
  end

  def resend_confirmation
    authorize current_user
    current_user.resend_confirmation_instructions
    render_success(
      current_user,
      "user.reconfirmation_sent",
      { blueprint_opts: { view: :current_user } }
    )
  end

  def reinvite
    authorize @user
    @user.invite!(current_user)
    render_success(
      @user,
      "user.reinvited",
      { blueprint_opts: { view: :invited_user } }
    )
  end

  def update_user_role
    authorize @user, :update_role?
    new_role = role_param

    if current_user.id == @user.id
      render json: {
               error: "You cannot change your own role."
             },
             status: :forbidden
      return
    end

    unless current_user.can_assign_role?(role_param)
      render json: {
               error: "You are not authorized to assign this role."
             },
             status: :forbidden
      return
    end

    if @user.update(role: new_role)
      render json: { success: true, role: @user.role }, status: :ok
    else
      render json: {
               error: @user.errors.full_messages.join(", ")
             },
             status: :unprocessable_entity
    end
  end

  def active_programs
    authorize current_user, :active_programs?

    programs = current_user.active_programs
    render json: {
             data: programs,
             meta: {
               total_count: programs.count
             }
           },
           status: :ok
  end

  private

  def role_param
    role = params.require(:role).to_s
    Rails.logger.info("Received role param: #{role}")
    Rails.logger.info("Available enum keys: #{User.roles.keys.inspect}")

    unless User.roles.key?(role)
      raise ActionController::BadRequest, "Invalid role: #{role}"
    end

    role
  end

  def email_changed?
    profile_params[:email] && profile_params[:email] != @user.email
  end

  def password_params
    params.require(:user).permit(:current_password, :password)
  end

  def find_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:role)
  end

  def profile_params
    # Transform all keys to snake_case first
    transformed_params =
      params.require(:user).deep_transform_keys { |key| key.to_s.underscore }

    transformed_params.permit(
      :email,
      preference_attributes: %i[
        enable_in_app_new_template_version_publish_notification
        enable_in_app_customization_update_notification
        enable_email_application_submission_notification
        enable_in_app_application_submission_notification
        enable_email_application_view_notification
        enable_in_app_application_view_notification
        enable_email_application_revisions_request_notification
        enable_in_app_application_revisions_request_notification
        enable_in_app_collaboration_notification
        enable_email_collaboration_notification
        enable_in_app_integration_mapping_notification
        enable_email_integration_mapping_notification
      ],
      mailing_address_attributes: %i[
        street_address
        locality
        region
        postal_code
        country
      ]
    )
  end
end
