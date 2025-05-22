class ExternalApi::PermitApplicationPolicy < ExternalApi::ApplicationPolicy
  def index?
    external_api_key.program == record.program && record.submitted? &&
      record.sandbox == sandbox
  end

  def show?
    index?
  end

  def show_integration_mapping?
    external_api_key.program == record.program
  end

  class Scope < Scope
    def resolve
      scope.where(submitter: user, sandbox: sandbox)
    end
  end
end
