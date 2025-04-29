class Api::ProgramMembershipsController < Api::ApplicationController
  before_action :set_program_membership

  def deactivate
    authorize @program_membership
    update_deactivated_at(Time.current)
  end

  def reactivate
    authorize @program_membership
    update_deactivated_at(nil)
  end

  private

  def set_program_membership
    @program_membership = ProgramMembership.find(params[:id])
  end

  def update_deactivated_at(value)
    if @program_membership.update(deactivated_at: value)
      render_success(@program_membership)
    else
      render_error(@program_membership.errors.full_messages)
    end
  end

  def render_success(data)
    render json: ProgramMembershipBlueprint.render(data), status: :ok
  end

  def render_error(errors)
    render json: { errors: errors }, status: :unprocessable_entity
  end
end
