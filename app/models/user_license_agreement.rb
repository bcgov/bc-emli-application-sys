class UserLicenseAgreement < ApplicationRecord
  include Auditable

  belongs_to :account, polymorphic: true
  belongs_to :agreement, class_name: "EndUserLicenseAgreement"

  validates :accepted_at, presence: true
  validate :account_eula_variant_matches_agreement_variant

  def self.active_agreement(variant)
    where(agreement_id: EndUserLicenseAgreement.active_agreement(variant).id)
  end

  private

  def account_eula_variant_matches_agreement_variant
    return if account.blank? || agreement.blank?

    if account.is_a?(User) && account.eula_variant != agreement.variant
      errors.add(:agreement, "variant must match account's eula_variant")
    end
  end
end
