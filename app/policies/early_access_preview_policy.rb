class EarlyAccessPreviewPolicy < RequirementTemplatePolicy
  def revoke_access?
    user.system_admin?
  end

  def unrevoke_access?
    revoke_access?
  end

  def extend_access?
    revoke_access?
  end
end
