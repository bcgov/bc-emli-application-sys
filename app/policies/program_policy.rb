class ProgramPolicy < ApplicationPolicy
  def show?
    true
  end

  def locality_type_options?
    true
  end

  def index?
    show?
  end

  def jurisdiction_options?
    index?
  end

  def program_options?
    index?
  end

  def create?
    user.system_admin?
  end

  def update?
    user.system_admin? || user.admin_manager?
  end

  def manage_external_api?
    user.system_admin?
  end

  def update_external_api_enabled?
    user.system_admin? && record.external_api_disabled?
  end

  def search_users?
    user.system_admin? || user.admin_manager? || user.admin?
  end

  def search_permit_applications?
    user.admin_manager? || user.admin?
  end

  def sandboxes?
    update?
  end

  class Scope < Scope
    def resolve
      scope.all
    end
  end
end
