class ExternalApiKeyPolicy < ApplicationPolicy
  def index?
    user.system_admin? || user.admin_manager?
  end

  def show?
    return true if user.system_admin? || user.admin_manager?
  end

  def create?
    show?
  end

  def update?
    create?
  end

  def destroy?
    create?
  end

  def revoke?
    create?
  end

  class Scope < Scope
    def resolve
      unless user.system_admin? || user.admin_manager?
        raise Pundit::NotAuthorizedError
      end

      if user.system_admin?
        ExternalApiKey.all
      else
        ExternalApiKey.where(program_id: user.program.pluck(:id))
      end
    end
  end
end
