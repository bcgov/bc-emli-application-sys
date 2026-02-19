class AddContractorOnboardingRevisionReason < ActiveRecord::Migration[7.1]
  def up
    site_config = SiteConfiguration.first
    return unless site_config

    RevisionReason.find_or_create_by!(
      reason_code: "contractor_onboarding_form"
    ) do |r|
      r.description = "Contractor Onboarding Form"
      r.site_configuration = site_config
    end
  end

  def down
    RevisionReason.find_by(reason_code: "contractor_onboarding_form")&.destroy
  end
end
