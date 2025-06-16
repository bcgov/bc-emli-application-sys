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

    if @user_group_type.blank? || @audience_type.blank? ||
         @submission_type.blank?
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
        "#{@program&.program_name} #{SecureRandom.hex(4)}"

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
          status: 1
        )
    rescue ActiveRecord::RecordNotFound
      render_error(
        "application_controller.participant_application_not_published",
        status: :not_found
      ) and return
    end
  end
end
