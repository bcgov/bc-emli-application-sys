class Api::ContractorEmployeesController < Api::ApplicationController
  before_action :set_contractor
  before_action :set_employee

  # Deactivate employee
  def deactivate
    authorize @contractor
    if @employee.employee.update(discarded_at: Time.current)
      render_success nil, "contractor.employees.deactivate_success"
    else
      render_error "contractor.employees.deactivate_error",
                   status: :unprocessable_entity
    end
  end

  # Reactivate employee
  def reactivate
    authorize @contractor
    if @employee.employee.update(discarded_at: nil)
      render_success nil, "contractor.employees.reactivate_success"
    else
      render_error "contractor.employees.reactivate_error",
                   status: :unprocessable_entity
    end
  end

  # Re-invite pending employee
  def reinvite
    authorize @contractor
    employee_user = @employee.employee
    if employee_user.present?
      # Server-side guard: only allow reinvite if pending invitation exists
      unless employee_user.invitation_token.present? ||
               (
                 employee_user.invitation_sent_at.present? &&
                   employee_user.invitation_accepted_at.nil?
               )
        render_error "contractor.employees.no_pending_invite",
                     status: :unprocessable_entity
        return
      end

      begin
        employee_user.invite!(
          current_user,
          { contractor_name: @contractor.business_name }
        )
        render_success nil, "contractor.employees.reinvite_success"
      rescue StandardError => e
        Rails.logger.error(
          "Failed to reinvite employee #{employee_user.id}: #{e.message}"
        )
        render_error "contractor.employees.reinvite_error",
                     { status: :unprocessable_entity }
      end
    else
      render_error "contractor.employees.employee_not_found", status: :not_found
    end
  end

  # Revoke invite for pending employee
  def revoke_invite
    authorize @contractor
    employee_user = @employee.employee
    if employee_user.present? && employee_user.invitation_token.present?
      employee_user.invitation_token = nil
      if employee_user.save
        render_success nil, "contractor.employees.revoke_success"
      else
        render_error "contractor.employees.revoke_error",
                     status: :unprocessable_entity
      end
    else
      render_error "contractor.employees.no_pending_invite",
                   status: :unprocessable_entity
    end
  end

  private

  def set_contractor
    @contractor = Contractor.find(params[:contractor_id])
  end

  def set_employee
    # params[:id] is the User ID (employee_id), not ContractorEmployee ID
    @employee =
      @contractor.contractor_employees.find_by!(employee_id: params[:id])
  end
end
