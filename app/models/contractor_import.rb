class ContractorImport < ApplicationRecord
  def summary
    {
      invite_code: invite_code,
      business_name: payload.dig("business", "name"),
      primary_contact: payload.dig("contacts", "primary")
    }
  end

  def consumed?
    consumed_at.present?
  end

  def consume!(user:, contractor:)
    update!(
      consumed_at: Time.current,
      consumed_by_user_id: user.id,
      contractor_id: contractor.id
    )
  end
end
