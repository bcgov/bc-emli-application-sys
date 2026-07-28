require "rails_helper"

RSpec.describe EligibilityCodePolicy do
  let(:sandbox) { nil }

  # The policy authorizes the :eligibility_code symbol (see Api::EligibilityCodesController#show).
  subject do
    described_class.new(UserContext.new(user, sandbox), :eligibility_code)
  end

  # Build a suspended contractor whose primary contact is `contact`.
  # suspended? reads latest_onboard.suspended_at, so an onboard with suspended_at is required.
  def create_suspended_contractor(contact:)
    contractor =
      Contractor.create!(
        business_name: "Suspended Co #{SecureRandom.hex(4)}",
        contact: contact
      )
    onboard_application =
      FactoryBot.create(:permit_application, submitter: contractor)
    ContractorOnboard.create!(
      contractor: contractor,
      onboard_application: onboard_application,
      suspended_at: Time.current
    )
    contractor
  end

  describe "#check?" do
    context "as a suspended contractor (primary contact)" do
      let(:user) { FactoryBot.create(:user, role: :contractor) }
      before { create_suspended_contractor(contact: user) }

      it "denies eligibility-code validation" do
        expect(subject.check?).to be false
      end
    end

    context "as an employee of a suspended contractor" do
      let(:user) { FactoryBot.create(:user, role: :contractor) }
      let(:primary_contact) { FactoryBot.create(:user, role: :contractor) }

      before do
        contractor = create_suspended_contractor(contact: primary_contact)
        ContractorEmployee.create!(contractor: contractor, employee: user)
      end

      it "denies eligibility-code validation" do
        expect(subject.check?).to be false
      end
    end

    context "as an active (non-suspended) contractor" do
      let(:user) { FactoryBot.create(:user, role: :contractor) }

      it "permits eligibility-code validation" do
        expect(subject.check?).to be true
      end
    end

    %i[admin admin_manager system_admin].each do |role|
      context "as #{role}" do
        let(:user) { FactoryBot.create(:user, role: role) }

        it "permits eligibility-code validation" do
          expect(subject.check?).to be true
        end
      end
    end
  end
end
