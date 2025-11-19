class LiveRequirementTemplatePolicy < RequirementTemplatePolicy
  def resolve
    # Ensure only LiveRequirementTemplate records are returned
    scope.where(type: LiveRequirementTemplate.name)
  end

  def request_supporting_files?
    true
  end
end
