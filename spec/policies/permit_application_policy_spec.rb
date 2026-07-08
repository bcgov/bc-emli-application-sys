require "rails_helper"

RSpec.describe PermitApplicationPolicy do
  subject do
    described_class.new(
      UserContext.new(user, sandbox),
      draft_permit_application
    )
  end

  let(:resolved_scope) do
    described_class::Scope.new(
      UserContext.new(user, sandbox),
      PermitApplication.all
    ).resolve
  end

  let!(:user) { FactoryBot.create(:user) }
  let!(:submitter) { FactoryBot.create(:user, :submitter) }
  let!(:jurisdiction) { FactoryBot.create(:sub_district) }
  let!(:sandbox) { jurisdiction.sandboxes.first }

  let!(:draft_permit_application) do
    FactoryBot.create(
      :permit_application,
      submitter: submitter,
      jurisdiction: jurisdiction,
      sandbox: sandbox
    )
  end

  context "for a submitter" do
    let(:user) { submitter }

    it "permits show" do
      expect(subject.show?).to be true
    end

    it "permits search on own application" do
      expect(subject.index?).to be true
    end

    it "permits create" do
      expect(subject.create?).to be true
    end

    it "permits update" do
      expect(subject.update?).to be true
    end

    it "permits submit" do
      expect(subject.submit?).to be true
    end

    it "only includes own permit applications in scope" do
      other_user_application =
        FactoryBot.create(
          :permit_application,
          jurisdiction: jurisdiction,
          sandbox: sandbox
        )
      expect(resolved_scope).to include(draft_permit_application)
      expect(resolved_scope).not_to include(other_user_application)
    end
  end

  context "for a super admin" do
    let(:user) { FactoryBot.create(:user, :super_admin) }

    it "permits search" do
      expect(subject.index?).to be true
    end
  end

  context "for a submitter with a submitted permit application" do
    let!(:user) { submitter }
    let!(:submitted_permit_application) do
      FactoryBot.create(
        :permit_application,
        :newly_submitted,
        jurisdiction: jurisdiction,
        submitter: submitter
      )
    end

    subject do
      described_class.new(
        UserContext.new(user, sandbox),
        submitted_permit_application
      )
    end

    it "does not permit update" do
      expect(subject.update?).to be false
    end
  end

  describe "internal comments" do
    shared_examples "permits internal comments" do
      it "permits viewing internal comments" do
        expect(subject.view_internal_comments?).to be true
      end

      it "permits creating internal comments" do
        expect(subject.create_internal_comment?).to be true
      end
    end

    shared_examples "forbids internal comments" do
      it "does not permit viewing internal comments" do
        expect(subject.view_internal_comments?).to be false
      end

      it "does not permit creating internal comments" do
        expect(subject.create_internal_comment?).to be false
      end
    end

    context "for an admin" do
      let(:user) { FactoryBot.create(:user, role: :admin) }
      include_examples "permits internal comments"
    end

    context "for an admin_manager" do
      let(:user) { FactoryBot.create(:user, role: :admin_manager) }
      include_examples "permits internal comments"
    end

    context "for a system_admin" do
      # system_admin is NOT review staff; the model rejects them as authors, so the policy
      # forbids them too (aligned to avoid a policy-pass / validation-422 mismatch).
      let(:user) { FactoryBot.create(:user, :super_admin) }
      include_examples "forbids internal comments"
    end

    context "for a participant" do
      let(:user) { submitter }
      include_examples "forbids internal comments"
    end

    context "for a contractor" do
      let(:user) { FactoryBot.create(:user, role: :contractor) }
      include_examples "forbids internal comments"
    end
  end
end
