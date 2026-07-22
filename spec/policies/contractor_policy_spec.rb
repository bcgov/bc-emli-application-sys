require "rails_helper"

RSpec.describe ContractorPolicy do
  let(:sandbox) { nil }
  let(:contractor) { Contractor.create!(business_name: "Policy Contractor") }

  subject { described_class.new(UserContext.new(user, sandbox), contractor) }

  describe "#status_history?" do
    # Mirrors #suspend? - anyone who can suspend can view the history.
    # Deliberately broader than AuditLogPolicy (which excludes plain admins),
    # so an admin who can suspend can also see why.
    context "roles that can suspend" do
      %i[admin admin_manager].each do |role|
        context "as #{role}" do
          let(:user) { FactoryBot.create(:user, role: role) }
          it "permits viewing history" do
            expect(subject.status_history?).to be true
          end
        end
      end
    end

    context "roles that cannot suspend" do
      %i[participant contractor system_admin].each do |role|
        context "as #{role}" do
          let(:user) { FactoryBot.create(:user, role: role) }
          it "denies viewing history" do
            expect(subject.status_history?).to be false
          end
        end
      end
    end
  end
end
