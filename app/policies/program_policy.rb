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
    user.system_admin? || user.admin_manager? || (user.staff? && user.jurisdictions.find(record.id))
  end

  def update_external_api_enabled?
    user.system_admin? ||
      (user.manager? && user.jurisdictions.find(record.id) && !record.g_off?)
  end

  def search_users?
    update?
  end

  def search_permit_applications?
    # note that this applies to the jurisdiction, not the permit applications
    update?
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
