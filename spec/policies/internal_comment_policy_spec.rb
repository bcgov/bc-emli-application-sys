require "rails_helper"

RSpec.describe InternalCommentPolicy do
  let(:sandbox) { nil }
  let!(:permit_application) { FactoryBot.create(:permit_application) }
  let!(:author) { FactoryBot.create(:user, role: :admin_manager) }
  let!(:other_admin) { FactoryBot.create(:user, role: :admin) }
  let!(:participant) { FactoryBot.create(:user, role: :participant) }
  let!(:comment) do
    InternalComment.create!(
      permit_application: permit_application,
      user: author,
      body: "a note"
    )
  end

  subject { described_class.new(UserContext.new(user, sandbox), comment) }

  describe "#destroy?" do
    context "as the author (review staff)" do
      let(:user) { author }
      it "permits delete" do
        expect(subject.destroy?).to be true
      end
    end

    context "as a different review-staff user" do
      let(:user) { other_admin }
      it "does not permit delete" do
        expect(subject.destroy?).to be false
      end
    end

    context "as a non-review-staff user" do
      let(:user) { participant }
      it "does not permit delete" do
        expect(subject.destroy?).to be false
      end
    end
  end
end
