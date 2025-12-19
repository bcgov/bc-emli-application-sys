class Api::EspApplicationController < Api::ApplicationController
  before_action :set_resources, only: [:create]

  def create
    #Rails.logger.info("template: #{@template.inspect}")
    permit_application =
      PermitApplication.create!(
        submitter: @user,
        user_group_type: @user_group_type,
        audience_type: @audience_type,
        submission_type: @submission_type,
        submission_variant: @submission_variant,
        program: @program,
        status: :new_draft,
        nickname: @nickname,
        template_version: @template
      )

    authorize permit_application # Ensure Pundit authorization
    #permit_application.save(validate: false)
    permit_application.save!

    # ✅ Explicitly render the response to ensure `id` is included
    render json: permit_application.as_json(only: %i[id status nickname]),
           status: :created
  end

  def set_resources
    # Handles both nested and flat JSON params
    app_params = params[:esp_application]
    if app_params.blank?
      render json: {
               error: "Request body is missing or malformed"
             },
             status: :bad_request
      return
    end

    @user_group_type = UserGroupType.find_by(code: app_params[:user_group_type])
    @audience_type = AudienceType.find_by(code: app_params[:audience_type])
    @submission_type =
      SubmissionType.find_by(code: app_params[:submission_type])
    @submission_variant =
      (
        if app_params[:submission_variant_id].present?
          SubmissionVariant.find_by(id: app_params[:submission_variant_id])
        else
          nil
        end
      )

    if [@user_group_type, @audience_type, @submission_type].any?(&:blank?)
      render json: {
               error:
                 "Invalid user_group_type, audience_type, or submission_type"
             },
             status: :bad_request
      return
    end

    @program = Program.find_by!(slug: app_params[:slug])
    @user = User.find(app_params[:user_id])

    @nickname =
      app_params[:nickname] ||
        "#{@program&.program_name} ##{SecureRandom.hex(4)}"

    # If specific template version ID is provided, use it directly
    if app_params[:template_version_id].present?
      begin
        @template =
          TemplateVersion.find_by!(
            id: app_params[:template_version_id],
            status: :published
          )
        # Verify the template belongs to the correct program and matches the criteria
        requirement = @template.requirement_template
        unless requirement.program_id == @program&.id &&
                 requirement.user_group_type_id == @user_group_type&.id &&
                 requirement.audience_type_id == @audience_type&.id &&
                 requirement.submission_type_id == @submission_type&.id
          render_error(
            "application_controller.template_version_mismatch",
            status: :bad_request
          ) and return
        end
      rescue ActiveRecord::RecordNotFound
        render_error(
          "application_controller.template_version_not_found",
          status: :not_found
        ) and return
      end
    else
      # Fallback to old behavior: find template by criteria
      begin
        requirement =
          RequirementTemplate.find_by!(
            program_id: @program&.id,
            user_group_type_id: @user_group_type&.id,
            audience_type_id: @audience_type&.id,
            submission_type_id: @submission_type&.id
          )
      rescue ActiveRecord::RecordNotFound
        render_error(
          "application_controller.participant_application_not_found",
          status: :not_found
        ) and return
      end

      begin
        @template =
          TemplateVersion.find_by!(
            requirement_template_id: requirement.id,
            status: :published
          )
      rescue ActiveRecord::RecordNotFound
        render_error(
          "application_controller.participant_application_not_published",
          status: :not_found
        ) and return
      end
    end
  end
end
