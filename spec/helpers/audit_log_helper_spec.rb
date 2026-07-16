require "rails_helper"

RSpec.describe AuditLogHelper do
  let(:actor) do
    User.create!(
      first_name: "Actor",
      last_name: "Admin",
      email: "audit-helper-actor@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:employee) do
    User.create!(
      first_name: "Target",
      last_name: "Employee",
      email: "audit-helper-employee@example.com",
      password: "P@ssword1",
      confirmed_at: Time.current
    )
  end

  let(:contractor) do
    Contractor.create!(business_name: "Audit Helper Contractor", contact: actor)
  end

  let(:contractor_onboard) do
    ContractorOnboard.create!(
      contractor: contractor,
      onboard_application: create(:permit_application, submitter: contractor)
    )
  end

  let(:permit_application) do
    create(
      :permit_application,
      submitter: actor,
      nickname: "1568 GRANADA CRES",
      number: "000-000-999"
    )
  end

  describe ".format_changes" do
    it "prepends the identified user for an edit on the users table" do
      log =
        AuditLog.create!(
          table_name: "users",
          record_id: employee.id,
          action: "edit",
          data_before: {
            "discarded_at" => nil
          },
          data_after: {
            "discarded_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.first).to eq("User: #{employee.name} (#{employee.email})")
    end

    it "does not prepend a subject line for a login action (WHO already IS the subject)" do
      log =
        AuditLog.create!(
          table_name: "users",
          record_id: actor.id,
          action: "login",
          user_id: actor.id,
          data_after: {
            "user_id" => actor.id,
            "email" => actor.email,
            "ip_address" => "127.0.0.1",
            "user_agent" => "test",
            "sign_in_count" => 5
          }
        )

      changes = described_class.format_changes(log)

      expect(changes.join).not_to include("User: #{actor.name}")
    end

    it "falls back gracefully when the referenced user no longer exists" do
      log =
        AuditLog.create!(
          table_name: "users",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "discarded_at" => nil
          },
          data_after: {
            "discarded_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq("User: (deleted)")
    end

    it "prepends the identified contractor for an edit on contractor_onboards" do
      log =
        AuditLog.create!(
          table_name: "contractor_onboards",
          record_id: contractor_onboard.id,
          action: "edit",
          data_before: {
            "suspended_at" => nil
          },
          data_after: {
            "suspended_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Contractor: #{contractor.business_name} (##{contractor.number})"
      )
    end

    it "falls back gracefully when the referenced contractor_onboard no longer exists" do
      log =
        AuditLog.create!(
          table_name: "contractor_onboards",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "suspended_at" => nil
          },
          data_after: {
            "suspended_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Contractor: (deleted)"
      )
    end

    it "prepends the identified application for an edit on permit_applications" do
      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: permit_application.id,
          action: "edit",
          data_before: {
            "submitted_at" => nil
          },
          data_after: {
            "submitted_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Application: #{permit_application.nickname} (##{permit_application.number})"
      )
    end

    it "falls back gracefully when the referenced permit_application no longer exists" do
      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "submitted_at" => nil
          },
          data_after: {
            "submitted_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Application: (deleted)"
      )
    end

    it "prepends the identified contractor for an edit on contractors directly" do
      log =
        AuditLog.create!(
          table_name: "contractors",
          record_id: contractor.id,
          action: "edit",
          data_before: {
            "business_name" => "old"
          },
          data_after: {
            "business_name" => "new"
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Contractor: #{contractor.business_name} (##{contractor.number})"
      )
    end

    it "falls back gracefully when the referenced contractor no longer exists" do
      log =
        AuditLog.create!(
          table_name: "contractors",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "business_name" => "old"
          },
          data_after: {
            "business_name" => "new"
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Contractor: (deleted)"
      )
    end

    it "resolves an internal_comment subject through to its parent application" do
      comment =
        InternalComment.create!(
          permit_application: permit_application,
          user: actor,
          body: "a test comment"
        )

      log =
        AuditLog
          .where(table_name: "internal_comments", action: "create")
          .order(:created_at)
          .last

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Comment on Application: #{permit_application.nickname} (##{permit_application.number})"
      )
      expect(comment).to be_present
    end

    it "falls back gracefully when the referenced internal_comment no longer exists" do
      log =
        AuditLog.create!(
          table_name: "internal_comments",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "body" => "old"
          },
          data_after: {
            "body" => "new"
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Comment: (deleted)"
      )
    end

    it "resolves a revision_request subject through submission_version to its application" do
      submission_version =
        create(:submission_version, permit_application: permit_application)
      revision_request =
        RevisionRequest.create!(
          submission_version: submission_version,
          user: actor,
          comment: "please clarify X",
          reason_code: "zoning_non_compliance"
        )

      log =
        AuditLog
          .where(table_name: "revision_requests", action: "create")
          .order(:created_at)
          .last

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Revision Request on Application: #{permit_application.nickname} (##{permit_application.number})"
      )
      expect(revision_request).to be_present
    end

    it "falls back gracefully when the referenced revision_request no longer exists" do
      log =
        AuditLog.create!(
          table_name: "revision_requests",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "comment" => "old"
          },
          data_after: {
            "comment" => "new"
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Revision Request: (deleted)"
      )
    end

    it "resolves a template_version subject through to its requirement_template" do
      requirement_template =
        create(
          :early_access_requirement_template,
          nickname: "Test Template Nickname"
        )
      template_version =
        TemplateVersion.create!(
          requirement_template: requirement_template,
          version_date: Date.new(2026, 1, 15),
          status: 0
        )

      log =
        AuditLog
          .where(table_name: "template_versions", action: "create")
          .order(:created_at)
          .last

      changes = described_class.format_changes(log)

      expect(changes.first).to eq(
        "Template Version: #{requirement_template.nickname} (v2026-01-15)"
      )
    end

    it "falls back gracefully when the referenced template_version no longer exists" do
      log =
        AuditLog.create!(
          table_name: "template_versions",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "status" => 0
          },
          data_after: {
            "status" => 1
          },
          user_id: actor.id
        )

      expect(described_class.format_changes(log).first).to eq(
        "Template Version: (deleted)"
      )
    end

    it "does not prepend a subject line for tables with no resolution wired up" do
      log =
        AuditLog.create!(
          table_name: "program_memberships",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "deactivated_at" => nil
          },
          data_after: {
            "deactivated_at" => Time.current.iso8601
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.first).to include("Deactivated at")
    end

    it "resolves a *_by foreign key value to the referenced user's name when it differs from the actor" do
      reviewer =
        User.create!(
          first_name: "Second",
          last_name: "Reviewer",
          email: "audit-helper-reviewer@example.com",
          password: "P@ssword1",
          role: :admin,
          confirmed_at: Time.current
        )

      log =
        AuditLog.create!(
          table_name: "program_memberships",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "reviewed_by" => nil
          },
          data_after: {
            "reviewed_by" => reviewer.id
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.last).to include("#{reviewer.name} (#{reviewer.email})")
    end

    it "hides a *_by field's diff line when its value IS the acting user (duplicates WHO)" do
      log =
        AuditLog.create!(
          table_name: "contractor_onboards",
          record_id: contractor_onboard.id,
          action: "edit",
          data_before: {
            "suspended_by" => nil
          },
          data_after: {
            "suspended_by" => actor.id
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.join).not_to include("Suspended by")
    end

    it "hides a *_by field's diff line when the OLD value IS the acting user (unsuspend direction)" do
      log =
        AuditLog.create!(
          table_name: "contractor_onboards",
          record_id: contractor_onboard.id,
          action: "edit",
          data_before: {
            "suspended_by" => actor.id
          },
          data_after: {
            "suspended_by" => nil
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.join).not_to include("Suspended by")
    end

    it "still shows a *_by field's diff line when its value is NOT the acting user" do
      other_admin =
        User.create!(
          first_name: "Other",
          last_name: "Admin",
          email: "audit-helper-other-admin@example.com",
          password: "P@ssword1",
          role: :admin,
          confirmed_at: Time.current
        )

      log =
        AuditLog.create!(
          table_name: "contractor_onboards",
          record_id: contractor_onboard.id,
          action: "edit",
          data_before: {
            "suspended_by" => nil
          },
          data_after: {
            "suspended_by" => other_admin.id
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.join).to include("Suspended by")
      expect(changes.join).to include(
        "#{other_admin.name} (#{other_admin.email})"
      )
    end

    it "truncates a large Hash/Array value instead of dumping it in full" do
      huge_blob = { "data" => { "field" => "x" * 5000 } }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "delete",
          data_before: {
            "submission_data" => huge_blob
          },
          data_after: nil,
          user_id: actor.id
        )

      changes = described_class.format_changes(log)
      line = changes.detect { |c| c.include?("Submission data") }

      expect(line).to be_present
      expect(line.length).to be < 300
    end

    it "leaf-diffs a changed nested Hash field instead of an identical truncated preview" do
      # Same shape that used to collide under whole-blob truncation: a large
      # unchanged prefix, then the real change buried past 200 chars. The
      # leaf-diff finds it directly instead of relying on string comparison.
      filler = "x" * 250
      old_data = {
        "data" => {
          "shared" => filler,
          "section6" => {
            "field_a" => "OLD_VALUE"
          }
        }
      }
      new_data = {
        "data" => {
          "shared" => filler,
          "section6" => {
            "field_a" => "NEW_VALUE"
          }
        }
      }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)
      line = changes.detect { |c| c.include?("field_a") }

      expect(line).to eq(
        "Changed Submission data.data.section6.field_a from OLD_VALUE to NEW_VALUE"
      )
      expect(changes.join).not_to include(filler)
    end

    it "leaf-diffs a simple top-level Hash field change" do
      old_data = { "field_a" => "OLD_VALUE" }
      new_data = { "field_a" => "NEW_VALUE" }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)
      line = changes.detect { |c| c.include?("Submission data") }

      expect(line).to eq(
        "Changed Submission data.field_a from OLD_VALUE to NEW_VALUE"
      )
    end

    it "recurses into a wholly new nested section instead of showing it as one opaque blob" do
      # The "first full form submission" case: an entire section goes from
      # missing (nil) to a populated Hash. There's nothing to compare it
      # against directly, but we should still recurse INTO the new Hash and
      # report its actual leaf values, not just dump the whole thing.
      old_data = { "data" => {} }
      new_data = {
        "data" => {
          "new_section" => {
            "field_a" => "value1",
            "field_b" => "value2"
          }
        }
      }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes).to include(
        "Changed Submission data.data.new_section.field_a from nil to value1"
      )
      expect(changes).to include(
        "Changed Submission data.data.new_section.field_b from nil to value2"
      )
    end

    it "filters out form.io's own bookkeeping keys (metadata, _vnote, state) as noise" do
      # These ride alongside the real form content ("data") in every
      # submission_data blob - pure library/browser telemetry, never
      # something an admin wants in an audit trail.
      old_data = { "data" => { "real_field" => "old" } }
      new_data = {
        "data" => {
          "real_field" => "new"
        },
        "metadata" => {
          "user_agent" => "Mozilla/5.0",
          "timezone" => "America/Los_Angeles"
        },
        "_vnote" => "some internal note",
        "state" => "submitted"
      }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: permit_application.id,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes).to eq(
        [
          "Application: #{permit_application.nickname} (##{permit_application.number})",
          "Changed Submission data.data.real_field from old to new"
        ]
      )
    end

    it "drops a leaf that goes from unset to a still-meaningless value (nil -> \"\" or nil -> false)" do
      # form.io represents an unanswered radio/select as an explicit "" and
      # an unchecked checkbox as an explicit `false` - both are still "no
      # answer", not a real change, same class of noise skip_value? already
      # filters for top-level scalar fields. A line reading "from nil to"
      # with nothing after "to" is worse than showing nothing at all.
      old_data = { "data" => {} }
      new_data = {
        "data" => {
          "unanswered_field" => "",
          "unchecked_box" => false,
          "real_answer" => "yes"
        }
      }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: permit_application.id,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes).to eq(
        [
          "Application: #{permit_application.nickname} (##{permit_application.number})",
          "Changed Submission data.data.real_answer from nil to yes"
        ]
      )
    end

    it "caps the number of leaf diffs shown and notes how many more there were" do
      old_data = (1..25).index_with { |i| "old_#{i}" }
      new_data = (1..25).index_with { |i| "new_#{i}" }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: permit_application.id,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      # +1 for the "Application: ..." subject line prepended ahead of the
      # leaf diffs + trailer.
      expect(changes.size).to eq(AuditLogHelper::MAX_LEAF_DIFFS + 2)
      expect(changes.last).to eq("... and 5 more field changes")
    end

    it "still flags an unchanged-preview Array field (arrays aren't leaf-diffed)" do
      filler = "x" * 250
      old_data = { "files" => [filler, "old_marker"] }
      new_data = { "files" => [filler, "new_marker"] }

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "submission_data" => old_data
          },
          data_after: {
            "submission_data" => new_data
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)
      line = changes.detect { |c| c.include?("files") }

      expect(line).to include("preview identical after truncation")
    end

    it "leaf-diffs the true first-submission case: the column itself is nil, not an empty Hash" do
      # submission_data/requirement_json/form_json are nullable with no
      # default - a brand-new record has the column as actual SQL NULL, not
      # {}. The dispatch in format_update_changes must catch this (either
      # side being a Hash, not requiring both) or it falls back to a
      # truncated whole-blob dump - exactly what leaf-diffing was meant to
      # replace for the most common real-world trigger of it.
      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: permit_application.id,
          action: "edit",
          data_before: {
            "submission_data" => nil
          },
          data_after: {
            "submission_data" => {
              "data" => {
                "section1" => {
                  "field_a" => "value1"
                }
              }
            }
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes).to eq(
        [
          "Application: #{permit_application.nickname} (##{permit_application.number})",
          "Changed Submission data.data.section1.field_a from nil to value1"
        ]
      )
    end

    it "falls back to raw text instead of raising when a date-shaped string isn't a valid date" do
      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "nickname" => "old"
          },
          data_after: {
            "nickname" => "2024-13-45T10:00:00 some free text"
          },
          user_id: actor.id
        )

      expect { described_class.format_changes(log) }.not_to raise_error

      changes = described_class.format_changes(log)
      expect(changes.last).to include("2024-13-45T10:00:00 some free text")
    end

    it "shows the full raw text instead of silently discarding it for a date-shaped string with trailing content" do
      # Time.parse would "succeed" here, silently parsing just the date/time
      # prefix and discarding everything after it - showing a plausible but
      # WRONG value instead of the actual free-text answer. Time.iso8601
      # correctly rejects the whole string (strict format, no trailing
      # content allowed), so it falls through to the raw-text branch instead.
      value = "2024-01-01T10:00:00 some real free text that is not a date"

      log =
        AuditLog.create!(
          table_name: "permit_applications",
          record_id: SecureRandom.uuid,
          action: "edit",
          data_before: {
            "nickname" => "old"
          },
          data_after: {
            "nickname" => value
          },
          user_id: actor.id
        )

      changes = described_class.format_changes(log)

      expect(changes.last).to include(value)
    end
  end
end
