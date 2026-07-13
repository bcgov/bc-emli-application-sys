class AhriLookupPolicy < ApplicationPolicy
  def create?
    user.contractor? || user.admin? || user.admin_manager? || user.system_admin?
  end
end
