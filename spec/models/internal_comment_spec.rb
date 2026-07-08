require "rails_helper"

RSpec.describe InternalComment, type: :model do
  let!(:permit_application) { FactoryBot.create(:permit_application) }
  let!(:admin) { FactoryBot.create(:user, role: :admin) }
  let!(:admin_manager) { FactoryBot.create(:user, role: :admin_manager) }
  let!(:participant) { FactoryBot.create(:user, role: :participant) }

  describe "validations" do
    it "is valid with a body authored by review staff" do
      comment =
        described_class.new(
          permit_application: permit_application,
          user: admin,
          body: "Waiting on insurance doc."
        )
      expect(comment).to be_valid
    end

    it "requires a body" do
      comment =
        described_class.new(
          permit_application: permit_application,
          user: admin,
          body: ""
        )
      expect(comment).not_to be_valid
      expect(comment.errors[:body]).to be_present
    end

    it "rejects a body over 5000 characters" do
      comment =
        described_class.new(
          permit_application: permit_application,
          user: admin,
          body: "a" * 5001
        )
      expect(comment).not_to be_valid
      expect(comment.errors[:body]).to be_present
    end

    it "allows an admin_manager as author" do
      comment =
        described_class.new(
          permit_application: permit_application,
          user: admin_manager,
          body: "note"
        )
      expect(comment).to be_valid
    end

    it "rejects a non-review-staff author (participant)" do
      comment =
        described_class.new(
          permit_application: permit_application,
          user: participant,
          body: "note"
        )
      expect(comment).not_to be_valid
      expect(comment.errors[:user]).to be_present
    end
  end

  describe "counter cache" do
    it "increments internal_comments_count on create" do
      expect {
        described_class.create!(
          permit_application: permit_application,
          user: admin,
          body: "note"
        )
        permit_application.reload
      }.to change(permit_application, :internal_comments_count).by(1)
    end

    it "decrements internal_comments_count on destroy" do
      comment =
        described_class.create!(
          permit_application: permit_application,
          user: admin,
          body: "note"
        )
      permit_application.reload
      expect {
        comment.destroy
        permit_application.reload
      }.to change(permit_application, :internal_comments_count).by(-1)
    end

    it "does not touch the permit application's updated_at on create" do
      permit_application.reload
      before = permit_application.updated_at
      described_class.create!(
        permit_application: permit_application,
        user: admin,
        body: "note"
      )
      permit_application.reload
      expect(permit_application.updated_at).to eq(before)
    end
  end

  describe "auditing (Auditable)" do
    around do |example|
      Current.user = admin
      example.run
      Current.user = nil
    end

    # NOTE: AuditLog has a random-UUID PK, so `.last` is non-deterministic — query by a unique
    # marker body instead of relying on ordering.
    it "logs a create with the acting user and body" do
      marker = "audit-create-#{SecureRandom.hex(4)}"
      described_class.create!(
        permit_application: permit_application,
        user: admin,
        body: marker
      )

      log =
        AuditLog
          .where(table_name: "internal_comments", action: "create")
          .detect { |l| l.data_after&.dig("body") == marker }
      expect(log).to be_present
      expect(log.user_id).to eq(admin.id)
    end

    it "logs a delete with the acting user and the deleted body" do
      marker = "audit-delete-#{SecureRandom.hex(4)}"
      comment =
        described_class.create!(
          permit_application: permit_application,
          user: admin,
          body: marker
        )
      comment.destroy

      log =
        AuditLog
          .where(table_name: "internal_comments", action: "delete")
          .detect { |l| l.data_before&.dig("body") == marker }
      expect(log).to be_present
      expect(log.user_id).to eq(admin.id)
    end
  end
end
