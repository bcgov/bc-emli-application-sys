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

  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.system_admin? || user.admin? || user.manager?
        scope.all
      else
        scope.where(contact: user)
      end
    end
  end
end
