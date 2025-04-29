require "rails_helper"

RSpec.describe "Users", type: :request do
  describe "GET /index" do
    pending "add some examples (or delete) #{__FILE__}"
  end
end

RSpec.describe User, type: :model do
  describe "#can_assign_role?" do
    let(:sys_admin) { create(:user, role: :system_admin) }
    let(:admin) { create(:user, role: :admin) }

    it "allows system_admin to assign any role" do
      expect(sys_admin.can_assign_role?("participant")).to be true
      expect(sys_admin.can_assign_role?("admin")).to be true
      expect(sys_admin.can_assign_role?("system_admin")).to be true
    end

    it "prevents admin from assigning system_admin" do
      expect(admin.can_assign_role?("system_admin")).to be false
    end

    it "allows admin to assign lower roles" do
      expect(admin.can_assign_role?("participant")).to be true
    end
  end
end

describe "#role_privilege_level" do
  it "returns correct privilege level for admin_manager" do
    user = create(:user, role: :admin_manager)
    expect(user.role_privilege_level).to eq(3)
  end
end
