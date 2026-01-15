class Api::ContractorsController < Api::ApplicationController
  include Api::Concerns::Search::Contractors
  include Api::Concerns::Search::ContractorUsers
  before_action :set_contractor,
                only: %i[
                  show
                  update
                  destroy
                  search_users
                  suspend
                  unsuspend
                  deactivate
                ]
  skip_before_action :authenticate_user!, only: %i[shim]
  skip_after_action :verify_authorized, only: %i[shim]
  skip_after_action :verify_policy_scoped, only: [:index]

  def index
    perform_contractor_search
    contractors = @contractor_search.results

    render_success contractors,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :base
                     },
                     meta: {
                       total_pages: @contractor_search.total_pages,
                       total_count: @contractor_search.total_count,
                       current_page: @contractor_search.current_page
                     }
                   }
  end

  def show
    authorize @contractor
    render_success @contractor,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :base
                     }
                   }
  end

  def create
    contractor = Contractor.new(contractor_params)
    authorize contractor
    if contractor.save
      render json: ContractorBlueprint.render(contractor), status: :created
    else
      render json: contractor.errors, status: :unprocessable_entity
    end
  end

  def update
    authorize @contractor
    if @contractor.update(contractor_params)
      render json: ContractorBlueprint.render(@contractor)
    else
      render json: @contractor.errors, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @contractor
    @contractor.destroy
    head :no_content
  end

  def shim
    contractor = Contractor.create!(business_name: "TBD", onboarded: false)
    render_success contractor, nil, { blueprint: ContractorBlueprint }
  end

  def search_users
    authorize @contractor
    perform_contractor_user_search
    authorized_results = @user_search.results
    total_count = @user_search.total_count

    render_success authorized_results,
                   nil,
                   {
                     blueprint: UserBlueprint,
                     blueprint_opts: {
                       view: :base
                     },
                     meta: {
                       total_pages: @user_search.total_pages,
                       total_count: total_count,
                       current_page: @user_search.current_page
                     }
                   }
  end

  def license_agreements
    # Find contractor where current user is the contact (owner)
    @contractor = Contractor.find_by!(contact: current_user)
    authorize @contractor

    render_success @contractor,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :accepted_license_agreements
                     }
                   }
  end

  def suspend
    authorize @contractor

    onboard = @contractor.latest_onboard
    unless onboard
      return(
        render json: {
                 error:
                   I18n.t(
                     "contractor.errors.no_onboard_record",
                     default: "Contractor has no onboarding record"
                   )
               },
               status: :unprocessable_entity
      )
    end

    # Suspend the contractor (sets suspended_at on contractor_onboard)
    if onboard.update(
         suspended_at: Time.current,
         suspended_reason: params[:reason],
         suspended_by: current_user
       )
      # Send email notification to primary contact
      # TODO: Re-enable if client wants emails sent
      # PermitHubMailer.contractor_suspended(@contractor).deliver_later

      # Reindex for Elasticsearch
      @contractor.reindex

      # Return success
      render_success @contractor,
                     "contractor.suspended",
                     {
                       blueprint: ContractorBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render json: {
               error: onboard.errors.full_messages
             },
             status: :unprocessable_entity
    end
  end

  def unsuspend
    authorize @contractor

    onboard = @contractor.latest_onboard
    unless onboard
      return(
        render json: {
                 error:
                   I18n.t(
                     "contractor.errors.no_onboard_record",
                     default: "Contractor has no onboarding record"
                   )
               },
               status: :unprocessable_entity
      )
    end

    # Unsuspend the contractor (clears suspended_at, suspended_reason, and suspended_by on contractor_onboard)
    if onboard.update(
         suspended_at: nil,
         suspended_reason: nil,
         suspended_by: nil
       )
      # Send email notification to primary contact
      # TODO: Re-enable if client wants emails sent
      # PermitHubMailer.contractor_unsuspended(@contractor).deliver_later

      # Reindex for Elasticsearch
      @contractor.reindex

      render_success @contractor,
                     "contractor.unsuspended",
                     {
                       blueprint: ContractorBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render json: {
               error: onboard.errors.full_messages
             },
             status: :unprocessable_entity
    end
  end

  def deactivate
    authorize @contractor

    onboard = @contractor.latest_onboard
    unless onboard
      return(
        render json: {
                 error:
                   I18n.t(
                     "contractor.errors.no_onboard_record",
                     default: "Contractor has no onboarding record"
                   )
               },
               status: :unprocessable_entity
      )
    end

    # Deactivate the contractor (sets deactivated_at, deactivated_reason, and deactivated_by on contractor_onboard)
    if onboard.update(
         deactivated_at: Time.current,
         deactivated_reason: params[:reason],
         deactivated_by: current_user
       )
      # Send email notification to primary contact
      # TODO: Re-enable if client wants emails sent
      # PermitHubMailer.contractor_removed(@contractor).deliver_later

      # Reindex for Elasticsearch
      @contractor.reindex

      render_success @contractor,
                     "contractor.removed",
                     {
                       blueprint: ContractorBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render json: {
               error: onboard.errors.full_messages
             },
             status: :unprocessable_entity
    end
  end

  private

  def set_contractor
    @contractor = Contractor.find(params[:id])
  end

  def contractor_params
    params.require(:contractor).permit(
      :contact_id,
      :business_name,
      :website,
      :phone_number,
      :onboarded
    )
  end
end
