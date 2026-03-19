class ExternalApi::TemplateVersionPolicy < ExternalApi::ApplicationPolicy
  def index?
    true
  end

  def show?
    record.requirement_template.program_id == external_api_key.program_id
  end

  class Scope < Scope
    def resolve
      rt_ids =
        RequirementTemplate.where(
          program_id: external_api_key.program_id
        ).pluck(:id)
      scope.where(requirement_template_id: rt_ids, status: :published)
    end
  end
end
