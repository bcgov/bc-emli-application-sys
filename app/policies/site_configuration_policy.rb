class SiteConfigurationPolicy < ApplicationPolicy
  def update?
    user.system_admin?
  end

  def show?
    true
  end
end
