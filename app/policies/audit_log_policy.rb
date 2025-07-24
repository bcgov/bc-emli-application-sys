class AuditLogPolicy < ApplicationPolicy
  def index?
    user.admin_manager? || user.system_admin?
  end

  def show?
    index?
  end

  class Scope < Scope
    def resolve
      # Admin managers and system admins can see all audit logs
      if user.admin_manager? || user.system_admin?
        scope.all
      else
        scope.none
      end
    end
  end
end
