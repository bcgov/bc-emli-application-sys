class ExternalApi::PermitApplicationPolicy < ExternalApi::ApplicationPolicy
  def index?
    external_api_key.program_id == record.program_id
  end

  def show?
    index?
  end

  def summary?
    index?
  end

  def show_integration_mapping?
    external_api_key.program_id == record.program_id
  end

  class Scope < Scope
    def resolve
      scope.where(submitter: user, sandbox: sandbox)
    end
  end
end
