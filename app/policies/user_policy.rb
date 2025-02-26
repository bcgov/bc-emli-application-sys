class UserPolicy < ApplicationPolicy
  def profile?
    user.id == record.id
  end

  def license_agreements?
    profile?
  end

  def update?
    user.manager? && record_in_users_jurisdictions?
  end

  def invite?
    user.system_admin? || user.manager?
  end

  def invite_reviewer?
    invite?
  end

  def index?
    user.system_admin?
  end

  def super_admins?
    user.system_admin?
  end

  def search_jurisdiction_users?
    return true if user.system_admin? && (record.manager? || record.system_admin?)
    user.manager? && record_in_users_jurisdictions?
  end

  def search_admin_users?
    user.system_admin? && record.system_admin?
  end

  def destroy?
    search_jurisdiction_users?
  end

  def restore?
    destroy?
  end

  def accept_eula?
    profile?
  end

  def accept_invitation?
    profile?
  end

  def resend_confirmation?
    profile?
  end

  def record_in_users_jurisdictions?
    user.jurisdictions.pluck(:id).intersect?(record.jurisdictions.pluck(:id))
  end

  def reinvite?
    invite?
  end

  class Scope < Scope
    # NOTE: Be explicit about which records you allow access to!
    # def resolve
    #   scope.all
    # end
  end
end
