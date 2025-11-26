class Api::ContractorEmployeesController < Api::ApplicationController
  before_action :set_contractor
  before_action :set_employee, except: [:invite]

  # Invite new employees
  def invite
    authorize @contractor

    program = Program.find(params[:program_id])
    inviter =
      ContractorEmployeeInviter.new(
        contractor: @contractor,
        program: program,
        invited_by: current_user
      )

    results = inviter.invite_employees(users_params)

    if results.values.flatten.any?
      render_success(results, nil, { blueprint: InvitationBlueprint })
    else
      render_error "contractor.employees.invite_error"
    end
  end

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
      # Server-side guard: don't allow reinvite if user is deactivated
      if employee_user.discarded?
        render_error "contractor.employees.cannot_reinvite_deactivated",
                     status: :unprocessable_entity
        return
      end

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
        program = Program.find(params[:program_id])
        employee_user.invite!(
          current_user,
          { contractor_name: @contractor.business_name, program_id: program.id }
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
      begin
        # Clear the invitation token
        employee_user.invitation_token = nil
        employee_user.save!

        # Remove the contractor employee association entirely
        @employee.destroy!

        # Check if this user should be completely deleted
        # Only delete if they have no other associations and never accepted an invite
        should_delete_user = employee_user.invitation_accepted_at.nil? &&
                            ContractorEmployee.where(employee: employee_user).count == 0 &&
                            employee_user.program_memberships.count == 0 &&
                            employee_user.permit_applications.count == 0

        if should_delete_user
          employee_user.destroy!
          Rails.logger.info("Deleted orphaned user #{employee_user.id} after revoking invite")
        end

        render_success nil, "contractor.employees.revoke_success"
      rescue StandardError => e
        Rails.logger.error("Failed to revoke employee invite: #{e.message}")
        render_error "contractor.employees.revoke_error",
                     status: :unprocessable_entity
      end
    else
      render_error "contractor.employees.no_pending_invite",
                   status: :unprocessable_entity
    end
  end

  # Set employee as primary contact
  def set_primary_contact
    authorize @contractor
    employee_user = @employee.employee

    if employee_user.present?
      if @contractor.update(contact: employee_user)
        render_success nil, "contractor.employees.set_primary_contact_success"
      else
        render_error "contractor.employees.set_primary_contact_error",
                     status: :unprocessable_entity
      end
    else
      render_error "contractor.employees.employee_not_found", status: :not_found
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

  def users_params
    params
      .require(:users)
      .map { |user_param| user_param.permit(:email, :name, :role) }
  end
end
