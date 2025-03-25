class Api::EspApplicationController < Api::ApplicationController
  before_action :set_resources, only: [:create]

  def create
    Rails.logger.info("template: #{@template.inspect}")
    permit_application =
      PermitApplication.create!(
        submitter: @user,
        jurisdiction: @sub_district,
        permit_type: @permit_type,
        activity: @activity,
        status: :new_draft,
        nickname: @nickname,
        template_version: @template,
        pid: "999999999"
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

    Rails.logger.debug "Final Params: #{app_params}" # debug

    if app_params.blank?
      render json: {
               error: "Request body is missing or malformed"
             },
             status: :bad_request
      return
    end

    #@activity = Activity.find_by(id: app_params[:activity_id])
    #@permit_type = PermitType.find_by(id: app_params[:permit_type_id])
    @permit_type = PermitType.find_by_code("low_residential")
    @activity = Activity.find_by_code("addition_alteration_renovation")
    @sub_district = SubDistrict.find_by(slug: "energy-savings-program")
    @user = User.find_by(id: app_params[:user_id])
    @nickname =
      app_params[:nickname] ||
        "Energy Savings Application #{SecureRandom.hex(4)}"
    requirement =
      RequirementTemplate.find_by(description: "ESP test application")
    Rails.logger.info("RequirmentID: #{requirement.id}")
    @template =
      TemplateVersion.find_by(
        requirement_template_id: requirement.id,
        status: 1
      )
  end
end
