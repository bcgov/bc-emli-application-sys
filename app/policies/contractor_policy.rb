class ContractorPolicy < ApplicationPolicy
  def index?
    # For now, all authenticated users can see contractors in the index
    true
  end

  def show?
    # Users can view contractors they are contact for, or admins can view any
    user.system_admin? || user.admin? || user.manager? || record.contact == user
  end

  def update?
    # Only the contact (owner) can update contractor details
    record.contact == user
  end

  def destroy?
    # Admins, managers, and system admins can delete any contractor, or the contact (owner) can delete their own
    user.system_admin? || user.admin? || user.manager? || record.contact == user
  end

  def license_agreements?
    # Only the contact (owner) can view license agreements
    record.contact == user
  end

  def create?
    # Anyone can create contractors via shim
    true
  end

  def search_users?
    # Admin managers, admins, and system admins can search contractor users
    user.system_admin? || user.admin? || user.admin_manager?
  end

  def deactivate?
    # Admin managers and admins can deactivate contractor employees
    user.admin_manager? || user.admin?
  end

  def reactivate?
    # Same permissions as deactivate
    deactivate?
  end

  def reinvite?
    # Same permissions as deactivate
    deactivate?
  end

  def revoke_invite?
    # Same permissions as deactivate
    deactivate?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.system_admin? || user.admin? || user.admin_manager?
        scope.all
      else
        scope.where(contact: user)
      end
    end
  end
end
