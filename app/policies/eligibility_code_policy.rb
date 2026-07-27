class EligibilityCodePolicy < ApplicationPolicy
  def check?
    # BCHEP-737: suspended contractors (and employees of a suspended contractor)
    # may not validate eligibility codes. contractor_suspended? covers both.
    return false if user.contractor_suspended?

    user.contractor? || user.admin? || user.admin_manager? || user.system_admin?
  end
end
