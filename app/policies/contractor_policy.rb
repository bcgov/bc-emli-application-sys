class ContractorPolicy < ApplicationPolicy
  def show?
    # Users can view contractors they are contact for, or admins can view any
    user.system_admin? || user.admin? || record.contact == user
  end

  def update?
    # Only the contact (owner) can update contractor details
    record.contact == user
  end

  def destroy?
    # Only the contact (owner) can delete contractor
    record.contact == user
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
      if user.system_admin? || user.admin?
        scope.all
      else
        scope.where(contact: user)
      end
    end
  end
end
