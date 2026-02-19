class AddContractorOnboardingRevisionReason < ActiveRecord::Migration[7.1]
  def up
    SiteConfiguration
      .instance
      .revision_reasons
      .find_or_create_by(reason_code: "contractor_onboarding_form") do |r|
        r.description = "Contractor Onboarding Form"
      end
  end

  def down
    RevisionReason.find_by(reason_code: "contractor_onboarding_form")&.destroy
  end
end
