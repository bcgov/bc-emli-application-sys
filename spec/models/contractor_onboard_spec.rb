require "rails_helper"

RSpec.describe ContractorOnboard, type: :model do
  let(:admin) do
    User.create!(
      first_name: "Admin",
      last_name: "User",
      email: "admin-audit-onboard@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:contractor) do
    Contractor.create!(business_name: "Audit Test Contractor", contact: admin)
  end

  let(:onboard_application) do
    create(:permit_application, submitter: contractor)
  end

  let(:contractor_onboard) do
    ContractorOnboard.create!(
      contractor: contractor,
      onboard_application: onboard_application
    )
  end

  describe "auditing (Auditable)" do
    around do |example|
      Current.user = admin
      example.run
      Current.user = nil
    end

    it "logs suspend as an edit with the reason and acting user" do
      marker = "suspend-reason-#{SecureRandom.hex(4)}"

      contractor_onboard.update!(
        suspended_at: Time.current,
        suspended_reason: marker,
        suspended_by: admin
      )

      log =
        AuditLog
          .where(table_name: "contractor_onboards", action: "edit")
          .detect { |l| l.data_after&.dig("suspended_reason") == marker }
      expect(log).to be_present
      expect(log.user_id).to eq(admin.id)
      expect(log.record_id).to eq(contractor_onboard.id)
    end

    it "logs unsuspend as an edit clearing the suspended fields" do
      contractor_onboard.update!(
        suspended_at: Time.current,
        suspended_reason: "will be cleared",
        suspended_by: admin
      )

      contractor_onboard.update!(
        suspended_at: nil,
        suspended_reason: nil,
        suspended_by: nil
      )

      log =
        AuditLog
          .where(
            table_name: "contractor_onboards",
            action: "edit",
            record_id: contractor_onboard.id
          )
          .detect do |l|
            l.data_before&.key?("suspended_at") &&
              l.data_after&.dig("suspended_at").nil?
          end
      expect(log).to be_present
      expect(log.user_id).to eq(admin.id)
    end

    it "logs remove (deactivate) as an edit with the reason and acting user" do
      marker = "remove-reason-#{SecureRandom.hex(4)}"

      contractor_onboard.update!(
        deactivated_at: Time.current,
        deactivated_reason: marker,
        deactivated_by: admin
      )

      log =
        AuditLog
          .where(table_name: "contractor_onboards", action: "edit")
          .detect { |l| l.data_after&.dig("deactivated_reason") == marker }
      expect(log).to be_present
      expect(log.user_id).to eq(admin.id)
      expect(log.record_id).to eq(contractor_onboard.id)
    end
  end
end
