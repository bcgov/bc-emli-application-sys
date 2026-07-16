require "rails_helper"

RSpec.describe Auditable do
  let(:admin) do
    User.create!(
      first_name: "Admin",
      last_name: "User",
      email: "auditable-spec-admin@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  around do |example|
    Current.user = admin
    example.run
    Current.user = nil
  end

  describe "record_id column availability (rolling-deploy safety)" do
    it "stamps record_id normally when the column exists" do
      contractor =
        Contractor.create!(business_name: "Auditable Spec Co", contact: admin)

      log =
        AuditLog
          .where(table_name: "contractors", action: "create")
          .order(:created_at)
          .detect { |l| l.record_id == contractor.id }

      expect(log).to be_present
      expect(log.record_id).to eq(contractor.id)
    end

    it "does not raise and omits record_id when the column is unavailable (e.g. mid-migration)" do
      # Simulates the window during a rolling deploy where new app code is
      # running against a DB that hasn't been migrated yet - record_id
      # wouldn't exist as a real column. Without the fix, this would raise
      # ActiveModel::UnknownAttributeError on the first attempt, get caught,
      # then raise the SAME error again on the retry (since the fallback
      # also included record_id), crashing the request instead of degrading
      # gracefully.
      allow(AuditLog).to receive(:column_names).and_return(
        AuditLog.column_names - ["record_id"]
      )

      expect do
        Contractor.create!(business_name: "Auditable Spec Co 2", contact: admin)
      end.not_to raise_error

      log =
        AuditLog
          .where(table_name: "contractors", action: "create")
          .order(:created_at)
          .last
      expect(log).to be_present
      expect(log.record_id).to be_nil
    end
  end

  describe "every Auditable model stamps record_id on create" do
    # Explicit, direct coverage for every model that includes Auditable -
    # several of these had never actually been verified for record_id
    # specifically (only checked via unrelated pre-existing specs, or by
    # inductive reasoning that "it's the same shared code path"). This
    # closes that gap for real, one assertion per model.
    it "for ExternalApiKey" do
      key = create(:external_api_key)
      log =
        AuditLog
          .where(table_name: "external_api_keys", action: "create")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(key.id)
    end

    it "for ProgramMembership" do
      membership = create(:program_membership)
      log =
        AuditLog
          .where(table_name: "program_memberships", action: "create")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(membership.id)
    end

    it "for RequirementTemplate" do
      template = create(:early_access_requirement_template)
      log =
        AuditLog
          .where(table_name: "requirement_templates", action: "create")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(template.id)
    end

    it "for RevisionRequest" do
      # The factory's default :reviewer trait is broken (pre-existing,
      # unrelated to this work - it tries to set a `jurisdiction` association
      # on User that no longer exists, part of the ongoing jurisdiction-is-
      # legacy cleanup). Override with a plain admin user instead, same
      # workaround the existing revision_request_spec.rb already uses.
      revision_request =
        create(:revision_request, user: create(:user, role: :admin))
      log =
        AuditLog
          .where(table_name: "revision_requests", action: "create")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(revision_request.id)
    end

    it "for TemplateVersion" do
      template_version = create(:template_version)
      log =
        AuditLog
          .where(table_name: "template_versions", action: "create")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(template_version.id)
    end

    it "for SiteConfiguration" do
      config = SiteConfiguration.first || SiteConfiguration.create!
      config.update!(
        sitewide_message: "audit spec check #{SecureRandom.hex(4)}"
      )
      log =
        AuditLog
          .where(table_name: "site_configurations", action: "edit")
          .order(:created_at)
          .last
      expect(log.record_id).to eq(config.id)
    end
  end

  describe "ApplicationAssignment#audit_excluded_columns" do
    let(:reviewer) do
      User.create!(
        first_name: "Reviewer",
        last_name: "User",
        email: "auditable-spec-reviewer@example.com",
        password: "P@ssword1",
        role: :admin,
        confirmed_at: Time.current
      )
    end

    it "keeps user_id in the audit trail (it's WHO was assigned, not the actor)" do
      # user_id is globally excluded by default (Auditable::EXCLUDED_COLUMNS)
      # because on most models it just duplicates the audit row's own actor.
      # ApplicationAssignment overrides that, since here it's real domain
      # data (which reviewer got assigned) - stripping it silently lost
      # exactly that information, with no way to recover it later.
      assignment = create(:application_assignment, user: reviewer)

      log =
        AuditLog
          .where(table_name: "application_assignments", action: "create")
          .order(:created_at)
          .last

      expect(log.data_after["user_id"]).to eq(reviewer.id)
      expect(AuditLogHelper.format_changes(log)).to include(
        "Created with User: #{reviewer.name} (#{reviewer.email})"
      )

      assignment.destroy!
    end

    it "still suppresses user_id when it genuinely IS the acting user (self-assignment)" do
      assignment = create(:application_assignment, user: admin)

      log =
        AuditLog
          .where(table_name: "application_assignments", action: "create")
          .order(:created_at)
          .last

      expect(AuditLogHelper.format_changes(log).join).not_to include(
        "Created with User:"
      )

      assignment.destroy!
    end
  end
end
