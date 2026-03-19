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
      scope.where(requirement_template_id: rt_ids, status: :published).where(
        "template_versions.version_date = (
            SELECT MAX(tv2.version_date) FROM template_versions tv2
            WHERE tv2.requirement_template_id = template_versions.requirement_template_id
            AND tv2.status = ?
          )",
        TemplateVersion.statuses[:published]
      )
    end
  end
end
