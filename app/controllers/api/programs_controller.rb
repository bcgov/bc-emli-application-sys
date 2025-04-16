class Api::ProgramsController < Api::ApplicationController
  include Api::Concerns::Search::Programs
  include Api::Concerns::Search::ProgramUsers
  include Api::Concerns::Search::PermitApplications

  before_action :set_program,
                only: %i[
                  show
                  update
                  search_users
                  search_permit_applications
                  update_external_api_enabled
                ]
  skip_after_action :verify_policy_scoped,
                    only: %i[index search_users search_permit_applications]
  skip_before_action :authenticate_user!,
                     only: %i[create show index jurisdiction_options]

  # skip_before_action :verify_authenticity_token, only: [:create]
  # skip_after_action :verify_authorized, only: :create

  def index
    perform_search_programs

    authorized_results = apply_search_authorization(@search.results)
    render_success authorized_results,
                   nil,
                   {
                     meta: {
                       total_pages: @search.total_pages,
                       total_count: @search.total_count,
                       current_page: @search.current_page
                     },
                     blueprint: ProgramBlueprint,
                     blueprint_opts: {
                       view: :base
                     }
                   }
  end

  def update
    authorize @program
    if program_params[:contacts_attributes]
      # Get current contact ids from the params
      payload_record_ids =
        program_params[:contacts_attributes].map { |c| c[:id] }
      # Mark contacts not included in the current payload for destruction
      @program.contacts.each do |contact|
        unless payload_record_ids.include?(contact.id.to_s)
          contact.mark_for_destruction
        end
      end
    end
    if @program.update(program_params)
      render_success @program,
                     "jurisdiction.update_success",
                     {
                       blueprint: ProgramBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render_error "jurisdiction.update_error",
                   message_opts: {
                     error_message: @program.errors.full_messages.join(", ")
                   }
    end
  end

  def update_external_api_enabled
    authorize @program, :update_external_api_enabled?

    desired_enabled = update_external_api_enabled_params

    begin
      @program.update_external_api_state!(
        enable_external_api: desired_enabled,
        allow_reset: current_user.super_admin?
      )

      # Determine the appropriate success message based on the new state
      message =
        case @program.external_api_state
        when "j_on"
          "jurisdiction.external_api_enabled_success"
        when "j_off", "g_off"
          "jurisdiction.external_api_disabled_success"
        else
          "jurisdiction.update_success"
        end

      render_success @program,
                     message,
                     {
                       blueprint: JurisdictionBlueprint,
                       blueprint_opts: {
                         view: :minimal
                       }
                     }
    rescue AASM::InvalidTransition, StandardError
      render_error "jurisdiction.update_external_api_enabled_error",
                   message_opts: {
                   }
    end
  end

  # GET /api/jurisdictions/:id
  def show
    logger.debug("Show method---#{@program}")
    authorize @program
    render_success(@program, nil, blueprint_opts: { view: :base })
  end

  # POST /api/program
  def create
    # class_to_use = Jurisdiction.class_for_locality_type(program_params[:locality_type])
    @program = Program.build(program_params)

    authorize @program

    if @program.save
      render_success @program,
                     "jurisdiction.create_success",
                     {
                       blueprint: ProgramBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render_error "jurisdiction.create_error",
                   message_opts: {
                     error_message: @program.errors.full_messages.join(", ")
                   }
    end
  end

  # POST /api/programs/:id/users/search
  def search_users
    authorize @program
    perform_user_search
    authorized_results =
      apply_search_authorization(
        @user_search.results,
        "search_program_membership_users"
      )
    render_success authorized_results,
                   nil,
                   {
                     meta: {
                       total_pages:
                         (
                           authorized_results.count.to_f / @user_search.per_page
                         ).ceil,
                       total_count: authorized_results.count,
                       current_page: @user_search.current_page
                     },
                     blueprint: UserBlueprint,
                     blueprint_opts: {
                       view: :base
                     }
                   }
  end

  # POST /api/jurisdictions/:id/permit_applications/search
  def search_permit_applications
    authorize @program
    perform_permit_application_search
    authorized_results =
      apply_search_authorization(@permit_application_search.results, "index")
    render_success authorized_results,
                   nil,
                   {
                     meta: {
                       total_pages: @permit_application_search.total_pages,
                       total_count: @permit_application_search.total_count,
                       current_page: @permit_application_search.current_page
                     },
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :jurisdiction_review_inbox
                     }
                   }
  end

  def jurisdiction_options
    authorize :jurisdiction, :jurisdiction_options?

    # TODO: refactor jurisdictions search to accomodate filters,
    # then use that here instead of having the search logic in the controller
    name = program_params["name"]
    type = program_params["type"]
    user_id = program_params["user_id"]

    filters = {}
    filters = { type: type } if type.present?
    filters = filters.merge({ user_ids: [user_id] }) if user_id.present?
    filters = { where: filters, match: :word_start }

    search = Jurisdiction.search(name || "*", **filters)
    options = search.results.map { |j| { label: j.qualified_name, value: j } }
    render_success options, nil, { blueprint: JurisdictionOptionBlueprint }
  end

  private

  def program_params
    params.require(:program).permit(
      :program_name,
      :funded_by,
      :description_html
    )
  end

  def update_external_api_enabled_params
    params.require(:external_api_enabled)
  end

  def set_program
    @program =
      Program.includes(Program::BASE_INCLUDES).friendly.find(params[:id])
  rescue ActiveRecord::RecordNotFound => e
    render_error("misc.not_found_error", { status: :not_found }, e)
  end
end
