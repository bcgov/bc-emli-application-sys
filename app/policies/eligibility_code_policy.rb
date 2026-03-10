class EligibilityCodePolicy < ApplicationPolicy
  def check?
    user.contractor? || user.admin? || user.admin_manager? || user.system_admin?
  end
end
