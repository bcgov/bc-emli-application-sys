class ExternalApi::ContractorPolicy < ExternalApi::ApplicationPolicy
  def index?
    true
  end

  def show?
    record
      .contractor_onboards
      .joins(:onboard_application)
      .exists?(
        permit_applications: {
          program_id: external_api_key.program_id,
          status: :approved
        }
      )
  end

  class Scope < Scope
    def resolve
      scope
        .joins(contractor_onboards: :onboard_application)
        .where(
          permit_applications: {
            program_id: external_api_key.program_id,
            status: :approved
          }
        )
        .distinct
    end
  end
end
