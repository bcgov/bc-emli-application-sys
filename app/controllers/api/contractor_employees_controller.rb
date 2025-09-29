class Api::ContractorEmployeesController < ApplicationController
  before_action :set_contractor
  before_action :set_employee

  # Remove employee from contractor program
  def remove
    @employee.employee.update(discarded_at: Time.current)
    render json: ContractorEmployeeBlueprint.render(@employee)
  end

  # Reactivate removed employee
  def reactivate
    @employee.employee.update(discarded_at: nil)
    render json: ContractorEmployeeBlueprint.render(@employee)
  end

  # Re-invite pending employee
  def reinvite
    employee_user = @employee.employee
    if employee_user.present?
      employee_user.invite!
      render json: { message: I18n.t("contractor.employees.reinvite_success") }
    else
      render json: {
               error: I18n.t("contractor.employees.employee_not_found")
             },
             status: :not_found
    end
  end

  # Revoke invite for pending employee
  def revoke_invite
    employee_user = @employee.employee
    if employee_user.present? && employee_user.invitation_token.present?
      employee_user.invitation_token = nil
      employee_user.save
      render json: { message: I18n.t("contractor.employees.revoke_success") }
    else
      render json: {
               error: I18n.t("contractor.employees.no_pending_invite")
             },
             status: :unprocessable_entity
    end
  end

  private

  def set_contractor
    @contractor = Contractor.find(params[:contractor_id])
  end

  def set_employee
    @employee = @contractor.contractor_employees.find(params[:id])
  end

  def employee_params
    params.require(:contractor_employee).permit(:contractor_id, :employee_id)
  end
end
