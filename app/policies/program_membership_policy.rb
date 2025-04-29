class ProgramMembershipPolicy < ApplicationPolicy
  def deactivate?
    user.system_admin? || user.admin_manager?
  end

  def reactivate?
    user.system_admin? || user.admin_manager?
  end
end
