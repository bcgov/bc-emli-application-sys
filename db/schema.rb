# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_04_204952) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "allowlisted_jwts",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "aud"
    t.datetime "created_at", null: false
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["jti"], name: "index_allowlisted_jwts_on_jti", unique: true
    t.index ["user_id"], name: "index_allowlisted_jwts_on_user_id"
  end

  create_table "application_assignments",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "permit_application_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["permit_application_id"],
            name: "index_application_assignments_on_permit_application_id"
    t.index %w[user_id permit_application_id],
            name: "index_application_assignments_on_user_and_permit",
            unique: true
    t.index ["user_id"], name: "index_application_assignments_on_user_id"
  end

  create_table "assets",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "audit_logs",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "action"
    t.datetime "created_at", null: false
    t.jsonb "data_after"
    t.jsonb "data_before"
    t.string "table_name"
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index ["action"], name: "idx_audit_logs_action"
    t.index ["created_at"], name: "idx_audit_logs_created_at"
    t.index %w[table_name created_at], name: "idx_audit_logs_table_created"
    t.index %w[user_id created_at],
            name: "idx_audit_logs_user_created",
            where: "(user_id IS NOT NULL)"
    t.index ["user_id"], name: "index_audit_logs_on_user_id"
  end

  create_table "aws_credentials",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.text "access_key_id", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "encryption_key_id"
    t.datetime "expires_at", null: false
    t.string "name", null: false
    t.text "secret_access_key", null: false
    t.text "session_token"
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_aws_credentials_on_active"
    t.index ["expires_at"], name: "index_aws_credentials_on_expires_at"
    t.index ["name"], name: "index_aws_credentials_on_name", unique: true
  end

  create_table "collaborators",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "collaboratorable_id", null: false
    t.string "collaboratorable_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index %w[collaboratorable_type collaboratorable_id],
            name: "idx_on_collaboratorable_type_collaboratorable_id_aa1cca136d"
    t.index %w[collaboratorable_type collaboratorable_id],
            name: "index_collaborators_on_collaboratorable"
    t.index ["user_id"], name: "index_collaborators_on_user_id"
  end

  create_table "contacts",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.text "address"
    t.string "business_license"
    t.string "business_name"
    t.string "cell"
    t.string "cell_number"
    t.uuid "contactable_id"
    t.string "contactable_type"
    t.datetime "created_at", null: false
    t.string "department"
    t.string "email"
    t.string "extension"
    t.string "first_name", default: "", null: false
    t.string "last_name", default: "", null: false
    t.string "organization"
    t.string "phone"
    t.string "professional_association"
    t.string "professional_number"
    t.string "title"
    t.datetime "updated_at", null: false
    t.index %w[contactable_type contactable_id],
            name: "index_contacts_on_contactable"
  end

  create_table "contractor_employees",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "contractor_id", null: false
    t.datetime "created_at", null: false
    t.uuid "employee_id", null: false
    t.datetime "updated_at", null: false
    t.index %w[contractor_id employee_id],
            name: "index_contractor_employees_on_contractor_id_and_employee_id",
            unique: true
    t.index ["contractor_id"],
            name: "index_contractor_employees_on_contractor_id"
    t.index ["employee_id"], name: "index_contractor_employees_on_employee_id"
  end

  create_table "contractor_imports",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "consumed_at"
    t.uuid "consumed_by_user_id"
    t.uuid "contractor_id"
    t.datetime "created_at", null: false
    t.string "invite_code", null: false
    t.datetime "invite_email_sent_at"
    t.jsonb "payload", null: false
    t.datetime "updated_at", null: false
    t.index ["consumed_at"], name: "index_contractor_imports_on_consumed_at"
    t.index ["contractor_id"], name: "index_contractor_imports_on_contractor_id"
    t.index ["invite_code"],
            name: "index_contractor_imports_on_invite_code",
            unique: true
    t.index ["invite_email_sent_at"],
            name: "index_contractor_imports_on_invite_email_sent_at"
    t.index ["payload"],
            name: "index_contractor_imports_on_payload",
            using: :gin
  end

  create_table "contractor_infos",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "contractor_id", null: false
    t.datetime "created_at", null: false
    t.string "doing_business_as"
    t.string "gst_number"
    t.integer "incorporated_year"
    t.string "license_issuer"
    t.string "license_number"
    t.integer "number_of_employees"
    t.text "primary_program_measure", default: [], null: false, array: true
    t.text "retrofit_enabling_measures", default: [], array: true
    t.text "service_languages", default: [], array: true
    t.text "type_of_business", default: [], null: false, array: true
    t.datetime "updated_at", null: false
    t.string "worksafebc_number"
    t.index ["contractor_id"],
            name: "index_contractor_infos_on_contractor_id",
            unique: true
  end

  create_table "contractor_onboards",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "contractor_id", null: false
    t.datetime "created_at", null: false
    t.datetime "deactivated_at"
    t.uuid "deactivated_by"
    t.text "deactivated_reason"
    t.uuid "onboard_application_id", null: false
    t.datetime "suspended_at"
    t.uuid "suspended_by"
    t.text "suspended_reason"
    t.datetime "updated_at", null: false
    t.index ["contractor_id"],
            name: "index_contractor_onboards_on_contractor_id"
    t.index ["onboard_application_id"],
            name: "index_contractor_onboards_on_onboard_application_id"
  end

  create_table "contractors",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "business_name", null: false
    t.string "cellphone_number"
    t.string "city"
    t.uuid "contact_id"
    t.datetime "created_at", null: false
    t.string "email"
    t.string "number"
    t.boolean "onboarded", default: false, null: false
    t.string "phone_number"
    t.string "postal_code"
    t.string "street_address"
    t.datetime "updated_at", null: false
    t.string "website"
    t.index ["contact_id"], name: "index_contractors_on_contact_id"
  end

  create_table "early_access_previews",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.uuid "early_access_requirement_template_id", null: false
    t.datetime "expires_at", null: false
    t.uuid "previewer_id", null: false
    t.datetime "updated_at", null: false
    t.index %w[early_access_requirement_template_id previewer_id],
            name: "index_early_access_previews_on_template_id_and_previewer_id",
            unique: true
    t.index ["previewer_id"],
            name: "index_early_access_previews_on_previewer_id"
  end

  create_table "end_user_license_agreements",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.boolean "active"
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "variant"
  end

  create_table "external_api_keys",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "connecting_application", null: false
    t.datetime "created_at", null: false
    t.datetime "expired_at"
    t.uuid "jurisdiction_id"
    t.string "name", null: false
    t.string "notification_email"
    t.uuid "program_id"
    t.datetime "revoked_at"
    t.uuid "sandbox_id"
    t.string "token", limit: 510, null: false
    t.datetime "updated_at", null: false
    t.string "webhook_url"
    t.index ["jurisdiction_id"],
            name: "index_external_api_keys_on_jurisdiction_id"
    t.index ["program_id"], name: "index_external_api_keys_on_program_id"
    t.index ["sandbox_id"], name: "index_external_api_keys_on_sandbox_id"
    t.index ["token"], name: "index_external_api_keys_on_token", unique: true
  end

  create_table "integration_mapping_notifications",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "front_end_path"
    t.uuid "notifiable_id", null: false
    t.string "notifiable_type", null: false
    t.datetime "processed_at"
    t.uuid "template_version_id", null: false
    t.datetime "updated_at", null: false
    t.index %w[notifiable_type notifiable_id],
            name: "index_integration_mapping_notifications_on_notifiable"
    t.index ["template_version_id"],
            name:
              "index_integration_mapping_notifications_on_template_version_id"
  end

  create_table "integration_mappings",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "jurisdiction_id", null: false
    t.jsonb "requirements_mapping", default: {}, null: false
    t.uuid "template_version_id", null: false
    t.datetime "updated_at", null: false
    t.index ["jurisdiction_id"],
            name: "index_integration_mappings_on_jurisdiction_id"
    t.index ["template_version_id"],
            name: "index_integration_mappings_on_template_version_id"
  end

  create_table "jurisdiction_memberships",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "jurisdiction_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["jurisdiction_id"],
            name: "index_jurisdiction_memberships_on_jurisdiction_id"
    t.index ["user_id"], name: "index_jurisdiction_memberships_on_user_id"
  end

  create_table "jurisdiction_template_version_customizations",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "customizations", default: {}
    t.uuid "jurisdiction_id", null: false
    t.uuid "sandbox_id"
    t.uuid "template_version_id", null: false
    t.datetime "updated_at", null: false
    t.index "jurisdiction_id, template_version_id, COALESCE(sandbox_id, '00000000-0000-0000-0000-000000000000'::uuid)",
            name: "index_jtvcs_unique_on_jurisdiction_template_sandbox",
            unique: true
    t.index ["jurisdiction_id"], name: "idx_on_jurisdiction_id_57cd0a7ea7"
    t.index ["sandbox_id"], name: "idx_on_sandbox_id_e5e6ef72b0"
    t.index ["template_version_id"],
            name: "idx_on_template_version_id_8359a99333"
  end

  create_table "jurisdictions",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.text "checklist_html"
    t.text "contact_summary_html"
    t.datetime "created_at", null: false
    t.text "description_html"
    t.string "external_api_state", default: "g_off", null: false
    t.date "incorporation_date"
    t.string "locality_type"
    t.text "look_out_html"
    t.jsonb "map_position"
    t.integer "map_zoom"
    t.string "name"
    t.string "postal_address"
    t.string "prefix", null: false
    t.uuid "regional_district_id"
    t.string "slug"
    t.string "type"
    t.datetime "updated_at", null: false
    t.index ["prefix"], name: "index_jurisdictions_on_prefix", unique: true
    t.index ["regional_district_id"],
            name: "index_jurisdictions_on_regional_district_id"
    t.index ["slug"], name: "index_jurisdictions_on_slug", unique: true
  end

  create_table "mechanical_energy_use_intensity_references",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.int4range "conditioned_space_area"
    t.numrange "conditioned_space_percent"
    t.datetime "created_at", null: false
    t.int4range "hdd"
    t.integer "meui"
    t.integer "step"
    t.datetime "updated_at", null: false
    t.index %w[hdd conditioned_space_percent step conditioned_space_area],
            name: "meui_composite_index",
            unique: true
  end

  create_table "permit_applications",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "activity_id"
    t.uuid "audience_type_id"
    t.jsonb "compliance_data", default: {}, null: false
    t.datetime "created_at", null: false
    t.boolean "first_nations", default: false
    t.jsonb "form_customizations_snapshot"
    t.string "full_address"
    t.uuid "jurisdiction_id"
    t.string "nickname"
    t.string "number"
    t.uuid "permit_type_id"
    t.string "pid"
    t.string "pin"
    t.uuid "program_id"
    t.string "reference_number"
    t.datetime "revisions_requested_at", precision: nil
    t.datetime "screened_in_at"
    t.boolean "first_nations", default: false
    t.uuid "sandbox_id"
    t.datetime "screened_in_at"
    t.datetime "signed_off_at"
    t.integer "status", default: 0
    t.text "status_update_reason"
    t.jsonb "submission_data"
    t.uuid "submission_type_id"
    t.uuid "submission_variant_id"
    t.string "submitted_for"
    t.uuid "submitter_id", null: false
    t.uuid "submission_variant_id"
    t.index ["activity_id"], name: "index_permit_applications_on_activity_id"
    t.index ["audience_type_id"],
            name: "index_permit_applications_on_audience_type_id"
    t.index ["jurisdiction_id"],
            name: "index_permit_applications_on_jurisdiction_id"
    t.index ["permit_type_id"],
            name: "index_permit_applications_on_permit_type_id"
    t.index %w[program_id number],
            name: "index_permit_applications_on_program_id_and_number",
            unique: true
    t.index ["program_id"], name: "index_permit_applications_on_program_id"
    t.index ["sandbox_id"], name: "index_permit_applications_on_sandbox_id"
    t.index ["submission_type_id"],
            name: "index_permit_applications_on_submission_type_id"
    t.index ["submission_variant_id"],
            name: "index_permit_applications_on_submission_variant_id"
    t.index ["template_version_id"],
            name: "index_permit_applications_on_template_version_id"
    t.index ["user_group_type_id"],
            name: "index_permit_applications_on_user_group_type_id"
  end

  create_table "permit_block_statuses",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.integer "collaboration_type", default: 0, null: false
    t.datetime "created_at", null: false
    t.uuid "permit_application_id", null: false
    t.string "requirement_block_id", null: false
    t.integer "status", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index %w[permit_application_id requirement_block_id collaboration_type],
            name: "index_block_statuses_on_app_id_and_block_id_and_collab_type",
            unique: true
    t.index ["permit_application_id"],
            name: "index_permit_block_statuses_on_permit_application_id"
  end

  create_table "permit_classifications",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.integer "code"
    t.datetime "created_at", null: false
    t.string "description"
    t.boolean "enabled"
    t.string "name", null: false
    t.uuid "parent_id"
    t.string "type", null: false
    t.datetime "updated_at", null: false
    t.index ["parent_id"], name: "index_permit_classifications_on_parent_id"
  end

  create_table "permit_collaborations",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "assigned_requirement_block_id"
    t.integer "collaboration_type", default: 0
    t.uuid "collaborator_id", null: false
    t.integer "collaborator_type", default: 0
    t.datetime "created_at", null: false
    t.uuid "permit_application_id", null: false
    t.datetime "updated_at", null: false
    t.index ["collaboration_type"],
            name: "index_permit_collaborations_on_collaboration_type"
    t.index ["collaborator_id"],
            name: "index_permit_collaborations_on_collaborator_id"
    t.index ["collaborator_type"],
            name: "index_permit_collaborations_on_collaborator_type"
    t.index %w[
              permit_application_id
              collaborator_id
              collaboration_type
              collaborator_type
              assigned_requirement_block_id
            ],
            name: "index_permit_collaborations_on_unique_columns",
            unique: true
    t.index ["permit_application_id"],
            name: "index_permit_collaborations_on_permit_application_id"
  end

  create_table "permit_type_required_steps",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "default"
    t.integer "energy_step_required"
    t.uuid "jurisdiction_id", null: false
    t.uuid "permit_type_id"
    t.datetime "updated_at", null: false
    t.integer "zero_carbon_step_required"
    t.index ["jurisdiction_id"],
            name: "index_permit_type_required_steps_on_jurisdiction_id"
    t.index ["permit_type_id"],
            name: "index_permit_type_required_steps_on_permit_type_id"
  end

  create_table "permit_type_submission_contacts",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "confirmation_sent_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.string "email", null: false
    t.uuid "jurisdiction_id"
    t.uuid "permit_type_id"
    t.index ["jurisdiction_id"],
            name: "index_permit_type_submission_contacts_on_jurisdiction_id"
    t.index ["permit_type_id"],
            name: "index_permit_type_submission_contacts_on_permit_type_id"
  end

  create_table "preferences",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "enable_email_application_revisions_request_notification",
              default: true
    t.boolean "enable_email_application_submission_notification", default: true
    t.boolean "enable_email_application_view_notification", default: true
    t.boolean "enable_email_collaboration_notification", default: true
    t.boolean "enable_email_customization_update_notification", default: true
    t.boolean "enable_email_integration_mapping_notification", default: true
    t.boolean "enable_email_new_template_version_publish_notification",
              default: true
    t.boolean "enable_in_app_application_revisions_request_notification",
              default: true
    t.boolean "enable_in_app_application_submission_notification", default: true
    t.boolean "enable_in_app_application_view_notification", default: true
    t.boolean "enable_in_app_collaboration_notification", default: true
    t.boolean "enable_in_app_customization_update_notification", default: true
    t.boolean "enable_in_app_integration_mapping_notification", default: true
    t.boolean "enable_in_app_new_template_version_publish_notification",
              default: true
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_preferences_on_user_id"
  end

  create_table "program_classification_memberships",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "program_membership_id"
    t.uuid "submission_type_id"
    t.datetime "updated_at", null: false
    t.uuid "user_group_type_id", null: false
    t.index ["program_membership_id"],
            name: "idx_on_program_membership_id_5e2504208f"
  end

  create_table "program_memberships",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "deactivated_at"
    t.uuid "program_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["program_id"], name: "index_program_memberships_on_program_id"
    t.index %w[user_id program_id],
            name: "index_program_memberships_on_user_id_and_program_id",
            unique: true
    t.index ["user_id"], name: "index_program_memberships_on_user_id"
  end

  create_table "programs",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description_html"
    t.string "external_api_state", default: "g_off", null: false
    t.string "funded_by", null: false
    t.integer "permit_applications_count", default: 0, null: false
    t.string "program_name", null: false
    t.string "slug"
    t.datetime "updated_at", null: false
  end

  create_table "requirement_blocks",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "custom_validations", default: {}, null: false
    t.string "description"
    t.datetime "discarded_at"
    t.string "display_description"
    t.string "display_name", null: false
    t.boolean "first_nations", default: false
    t.string "name", null: false
    t.integer "reviewer_role", default: 0, null: false
    t.integer "sign_off_role", default: 0, null: false
    t.string "sku"
    t.datetime "updated_at", null: false
    t.integer "visibility", default: 0, null: false
    t.index ["discarded_at"], name: "index_requirement_blocks_on_discarded_at"
    t.index %w[name first_nations],
            name: "index_requirement_blocks_on_name_and_first_nations",
            unique: true
    t.index ["sku"], name: "index_requirement_blocks_on_sku", unique: true
  end

  create_table "requirement_template_sections",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "copied_from_id"
    t.datetime "created_at", null: false
    t.string "name"
    t.integer "position"
    t.uuid "requirement_template_id", null: false
    t.datetime "updated_at", null: false
    t.index ["copied_from_id"],
            name: "index_requirement_template_sections_on_copied_from_id"
    t.index ["requirement_template_id"],
            name:
              "index_requirement_template_sections_on_requirement_template_id"
  end

  create_table "requirement_templates",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.uuid "activity_id"
    t.uuid "assignee_id"
    t.uuid "audience_type_id"
    t.uuid "copied_from_id"
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "discarded_at"
    t.datetime "fetched_at"
    t.boolean "first_nations", default: false
    t.string "nickname"
    t.uuid "permit_type_id"
    t.uuid "program_id"
    t.boolean "public", default: false
    t.uuid "submission_type_id"
    t.uuid "submission_variant_id"
    t.string "type"
    t.datetime "updated_at", null: false
    t.uuid "user_group_type_id"
    t.index ["activity_id"], name: "index_requirement_templates_on_activity_id"
    t.index ["assignee_id"], name: "index_requirement_templates_on_assignee_id"
    t.index ["copied_from_id"],
            name: "index_requirement_templates_on_copied_from_id"
    t.index ["discarded_at"],
            name: "index_requirement_templates_on_discarded_at"
    t.index ["permit_type_id"],
            name: "index_requirement_templates_on_permit_type_id"
    t.index ["program_id"], name: "index_requirement_templates_on_program_id"
    t.index ["submission_type_id"],
            name: "index_requirement_templates_on_submission_type_id"
    t.index ["submission_variant_id"],
            name: "index_requirement_templates_on_submission_variant_id"
    t.index ["type"], name: "index_requirement_templates_on_type"
  end

  create_table "requirements",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "elective", default: false
    t.string "hint"
    t.jsonb "input_options", default: {}, null: false
    t.integer "input_type", null: false
    t.string "label"
    t.integer "position"
    t.string "related_content"
    t.boolean "required", default: true, null: false
    t.boolean "required_for_in_person_hint", default: false, null: false
    t.boolean "required_for_multiple_owners", default: false, null: false
    t.uuid "requirement_block_id", null: false
    t.string "requirement_code", null: false
    t.datetime "updated_at", null: false
    t.index ["requirement_block_id"],
            name: "index_requirements_on_requirement_block_id"
  end

  create_table "revision_reasons",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.boolean "_discard"
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "discarded_at"
    t.string "reason_code", limit: 64
    t.uuid "site_configuration_id", null: false
    t.datetime "updated_at", null: false
    t.index ["reason_code"],
            name: "index_revision_reasons_on_reason_code",
            unique: true
    t.index ["site_configuration_id"],
            name: "index_revision_reasons_on_site_configuration_id"
  end

  create_table "revision_requests",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "comment", limit: 350
    t.datetime "created_at", null: false
    t.string "performed_by"
    t.string "reason_code", limit: 64
    t.jsonb "requirement_json"
    t.datetime "resolved_at"
    t.jsonb "submission_json"
    t.uuid "submission_version_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["submission_version_id"],
            name: "index_revision_requests_on_submission_version_id"
    t.index ["user_id"], name: "index_revision_requests_on_user_id"
  end

  create_table "sandboxes",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "jurisdiction_id", null: false
    t.string "name", null: false
    t.integer "template_version_status_scope", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["jurisdiction_id"], name: "index_sandboxes_on_jurisdiction_id"
  end

  create_table "site_configurations",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "display_sitewide_message"
    t.jsonb "help_link_items",
            default: {
              "dictionary_link_item" => {
                "href" => "",
                "show" => false,
                "title" => "Dictionary of terms",
                "description" =>
                  "See detailed explanations of terms that appear on building permits"
              },
              "user_guide_link_item" => {
                "href" => "",
                "show" => false,
                "title" => "User and role guides",
                "description" =>
                  "Step-by-step instructions on how to make the most out of the platform"
              },
              "get_started_link_item" => {
                "href" => "",
                "show" => false,
                "title" => "Get started on Building Permit Hub",
                "description" =>
                  "How to submit a building permit application through a streamlined and standardized approach across BC"
              },
              "best_practices_link_item" => {
                "href" => "",
                "show" => false,
                "title" => "Best practices",
                "description" =>
                  "How to use the Building Permit Hub efficiently for application submission"
              }
            },
            null: false
    t.jsonb "revision_reason_options"
    t.text "sitewide_message"
    t.string "sitewide_message_color"
    t.uuid "small_scale_requirement_template_id"
    t.datetime "updated_at", null: false
    t.index ["small_scale_requirement_template_id"],
            name: "idx_on_small_scale_requirement_template_id_235b636c86"
  end

  create_table "step_code_building_characteristics_summaries",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.jsonb "above_grade_walls_lines", default: [{}]
    t.jsonb "airtightness", default: {}
    t.jsonb "below_grade_walls_lines", default: [{}]
    t.datetime "created_at", null: false
    t.jsonb "doors_lines", default: [{ "performance_type" => "rsi" }]
    t.jsonb "fossil_fuels", default: {}
    t.jsonb "framings_lines", default: [{}]
    t.jsonb "hot_water_lines", default: [{ "performance_type" => "ef" }]
    t.jsonb "other_lines", default: [{}]
    t.jsonb "roof_ceilings_lines", default: [{}]
    t.jsonb "slabs_lines", default: [{}]
    t.jsonb "space_heating_cooling_lines",
            default: [
              { "variant" => "principal" },
              { "variant" => "secondary" }
            ]
    t.uuid "step_code_checklist_id", null: false
    t.jsonb "unheated_floors_lines", default: [{}]
    t.datetime "updated_at", null: false
    t.jsonb "ventilation_lines", default: [{}]
    t.jsonb "windows_glazed_doors",
            default: {
              "lines" => [{}],
              "performance_type" => "usi"
            }
    t.index ["step_code_checklist_id"],
            name: "idx_on_step_code_checklist_id_f0fc711627"
  end

  create_table "step_code_checklists",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "builder"
    t.integer "building_type"
    t.boolean "codeco"
    t.datetime "completed_at"
    t.text "completed_by"
    t.text "completed_by_address"
    t.text "completed_by_company"
    t.text "completed_by_email"
    t.text "completed_by_phone"
    t.text "completed_by_service_organization"
    t.integer "compliance_path"
    t.integer "compliance_status"
    t.datetime "created_at", null: false
    t.decimal "dwh_heating_consumption"
    t.text "energy_advisor_id"
    t.integer "epc_calculation_airtightness"
    t.boolean "epc_calculation_compliance"
    t.integer "epc_calculation_testing_target_type"
    t.text "home_state"
    t.decimal "hvac_consumption"
    t.text "notes"
    t.decimal "ref_dwh_heating_consumption"
    t.decimal "ref_hvac_consumption"
    t.boolean "site_visit_completed"
    t.boolean "site_visit_date"
    t.integer "stage", null: false
    t.integer "status", default: 0, null: false
    t.uuid "step_code_id"
    t.uuid "step_requirement_id"
    t.text "tester_company_name"
    t.text "tester_email"
    t.text "tester_name"
    t.text "tester_phone"
    t.integer "testing_pressure"
    t.integer "testing_pressure_direction"
    t.decimal "testing_result"
    t.integer "testing_result_type"
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_step_code_checklists_on_status"
    t.index ["step_code_id"], name: "index_step_code_checklists_on_step_code_id"
    t.index ["step_requirement_id"],
            name: "index_step_code_checklists_on_step_requirement_id"
  end

  create_table "step_code_data_entries",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.decimal "above_grade_heated_floor_area"
    t.decimal "ac_cooling_capacity"
    t.decimal "ach"
    t.decimal "aec"
    t.decimal "air_heat_pump_cooling_capacity"
    t.decimal "aux_energy_required"
    t.decimal "baseloads"
    t.decimal "below_grade_heated_floor_area"
    t.decimal "building_envelope_surface_area"
    t.decimal "building_volume"
    t.decimal "cooking"
    t.datetime "created_at", null: false
    t.decimal "design_cooling_load"
    t.decimal "district_energy_consumption"
    t.decimal "district_energy_ef"
    t.integer "dwelling_units_count"
    t.decimal "electrical_consumption"
    t.decimal "fwdr"
    t.decimal "grounded_heat_pump_cooling_capacity"
    t.jsonb "h2k_file_data"
    t.integer "hdd"
    t.decimal "heating_boiler"
    t.decimal "heating_combo"
    t.decimal "heating_furnace"
    t.decimal "hot_water"
    t.decimal "laundry"
    t.string "model"
    t.decimal "natural_gas_consumption"
    t.decimal "nla"
    t.decimal "other_ghg_consumption"
    t.decimal "other_ghg_ef"
    t.string "p_file_no"
    t.decimal "propane_consumption"
    t.decimal "proposed_gshl"
    t.decimal "ref_aec"
    t.decimal "ref_gshl"
    t.integer "stage", null: false
    t.uuid "step_code_id"
    t.datetime "updated_at", null: false
    t.string "version"
    t.decimal "water_heat_pump_cooling_capacity"
    t.string "weather_location"
    t.index ["step_code_id"],
            name: "index_step_code_data_entries_on_step_code_id"
  end

  create_table "step_codes",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "permit_application_id"
    t.string "plan_author"
    t.string "plan_date"
    t.string "plan_version"
    t.datetime "updated_at", null: false
    t.string "virus_name"
    t.datetime "virus_scan_completed_at"
    t.text "virus_scan_message"
    t.datetime "virus_scan_started_at"
    t.integer "virus_scan_status", default: 0, null: false
    t.index ["permit_application_id"],
            name: "index_step_codes_on_permit_application_id"
    t.index ["virus_scan_completed_at"],
            name: "index_step_codes_on_virus_scan_completed_at"
    t.index ["virus_scan_status"], name: "index_step_codes_on_virus_scan_status"
  end

  create_table "submission_versions",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "form_json"
    t.uuid "permit_application_id", null: false
    t.jsonb "step_code_checklist_json", default: {}
    t.jsonb "submission_data"
    t.datetime "updated_at", null: false
    t.datetime "viewed_at", precision: nil
    t.index ["permit_application_id"],
            name: "index_submission_versions_on_permit_application_id"
  end

  create_table "support_requests",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.text "additional_text"
    t.datetime "created_at", null: false
    t.uuid "linked_application_id"
    t.uuid "parent_application_id", null: false
    t.uuid "requested_by_id", null: false
    t.datetime "updated_at", null: false
    t.index ["linked_application_id"],
            name: "index_support_requests_on_linked_application_id"
    t.index ["parent_application_id"],
            name: "index_support_requests_on_parent_application_id"
    t.index ["requested_by_id"],
            name: "index_support_requests_on_requested_by_id"
  end

  create_table "supporting_documents",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.jsonb "compliance_data", default: {}, null: false
    t.datetime "created_at", null: false
    t.string "data_key"
    t.jsonb "file_data"
    t.uuid "permit_application_id", null: false
    t.uuid "submission_version_id"
    t.datetime "updated_at", null: false
    t.string "virus_name"
    t.datetime "virus_scan_completed_at"
    t.text "virus_scan_message"
    t.datetime "virus_scan_started_at"
    t.integer "virus_scan_status", default: 0, null: false
    t.index ["permit_application_id"],
            name: "index_supporting_documents_on_permit_application_id"
    t.index ["submission_version_id"],
            name: "index_supporting_documents_on_submission_version_id"
    t.index ["virus_scan_completed_at"],
            name: "index_supporting_documents_on_virus_scan_completed_at"
    t.index ["virus_scan_status"],
            name: "index_supporting_documents_on_virus_scan_status"
  end

  create_table "taggings",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "context", limit: 128
    t.datetime "created_at", precision: nil
    t.uuid "tag_id"
    t.uuid "taggable_id"
    t.string "taggable_type"
    t.uuid "tagger_id"
    t.string "tagger_type"
    t.string "tenant", limit: 128
    t.index ["context"], name: "index_taggings_on_context"
    t.index %w[tag_id taggable_id taggable_type context tagger_id tagger_type],
            name: "taggings_idx",
            unique: true
    t.index ["tag_id"], name: "index_taggings_on_tag_id"
    t.index %w[taggable_id taggable_type context],
            name: "taggings_taggable_context_idx"
    t.index %w[taggable_id taggable_type tagger_id context],
            name: "taggings_idy"
    t.index ["taggable_id"], name: "index_taggings_on_taggable_id"
    t.index %w[taggable_type taggable_id],
            name: "index_taggings_on_taggable_type_and_taggable_id"
    t.index ["taggable_type"], name: "index_taggings_on_taggable_type"
    t.index %w[tagger_id tagger_type],
            name: "index_taggings_on_tagger_id_and_tagger_type"
    t.index ["tagger_id"], name: "index_taggings_on_tagger_id"
    t.index %w[tagger_type tagger_id],
            name: "index_taggings_on_tagger_type_and_tagger_id"
    t.index ["tenant"], name: "index_taggings_on_tenant"
  end

  create_table "tags",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.integer "taggings_count", default: 0
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_tags_on_name", unique: true
  end

  create_table "template_section_blocks",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "position"
    t.uuid "requirement_block_id", null: false
    t.uuid "requirement_template_section_id", null: false
    t.datetime "updated_at", null: false
    t.index ["requirement_block_id"],
            name: "index_template_section_blocks_on_requirement_block_id"
    t.index ["requirement_template_section_id"],
            name: "idx_on_requirement_template_section_id_5469986497"
  end

  create_table "template_versions",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "denormalized_template_json", default: {}
    t.uuid "deprecated_by_id"
    t.integer "deprecation_reason"
    t.jsonb "form_json", default: {}
    t.jsonb "requirement_blocks_json", default: {}
    t.uuid "requirement_template_id"
    t.integer "status", default: 0
    t.datetime "updated_at", null: false
    t.date "version_date", null: false
    t.json "version_diff", default: {}
    t.index ["deprecated_by_id"],
            name: "index_template_versions_on_deprecated_by_id"
    t.index ["requirement_template_id"],
            name: "index_template_versions_on_requirement_template_id"
  end

  create_table "thermal_energy_demand_intensity_references",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.decimal "ach"
    t.datetime "created_at", null: false
    t.integer "gshl_over_300"
    t.integer "gshl_under_300"
    t.int4range "hdd"
    t.integer "hdd_adjusted_tedi"
    t.integer "ltrh_over_300"
    t.integer "ltrh_under_300"
    t.decimal "nla"
    t.decimal "nlr"
    t.integer "step"
    t.integer "tedi"
    t.datetime "updated_at", null: false
    t.index %w[hdd step], name: "tedi_composite_index", unique: true
  end

  create_table "user_addresses",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.string "address_type"
    t.string "country"
    t.datetime "created_at", null: false
    t.string "locality"
    t.string "postal_code"
    t.string "region"
    t.string "street_address"
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_user_addresses_on_user_id"
  end

  create_table "user_license_agreements",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.datetime "accepted_at", null: false
    t.uuid "account_id", null: false
    t.string "account_type", null: false
    t.uuid "agreement_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["agreement_id"],
            name: "index_user_license_agreements_on_agreement_id"
  end

  create_table "users",
               id: :uuid,
               default: -> { "gen_random_uuid()" },
               force: :cascade do |t|
    t.boolean "certified", default: false, null: false
    t.datetime "confirmation_sent_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "current_sign_in_at"
    t.datetime "discarded_at"
    t.string "email"
    t.string "encrypted_password", default: "", null: false
    t.string "first_name"
    t.datetime "invitation_accepted_at"
    t.datetime "invitation_created_at"
    t.integer "invitation_limit"
    t.datetime "invitation_sent_at"
    t.string "invitation_token"
    t.integer "invitations_count", default: 0
    t.uuid "invited_by_id"
    t.string "invited_by_type"
    t.string "last_name"
    t.datetime "last_sign_in_at"
    t.string "omniauth_email"
    t.string "omniauth_provider"
    t.string "omniauth_uid"
    t.string "omniauth_username"
    t.string "organization"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.boolean "reviewed", default: false, null: false
    t.integer "role", default: 0
    t.integer "sign_in_count", default: 0, null: false
    t.string "unconfirmed_email"
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"],
            name: "index_users_on_confirmation_token",
            unique: true
    t.index ["discarded_at"], name: "index_users_on_discarded_at"
    t.index ["email"], name: "index_users_on_email"
    t.index ["invitation_token"],
            name: "index_users_on_invitation_token",
            unique: true
    t.index ["invited_by_id"], name: "index_users_on_invited_by_id"
    t.index %w[invited_by_type invited_by_id], name: "index_users_on_invited_by"
    t.index %w[omniauth_provider omniauth_uid],
            name: "index_users_on_omniauth_provider_and_omniauth_uid",
            unique: true
    t.index ["reset_password_token"],
            name: "index_users_on_reset_password_token",
            unique: true
  end

  add_foreign_key "allowlisted_jwts", "users", on_delete: :cascade
  add_foreign_key "application_assignments", "permit_applications"
  add_foreign_key "application_assignments", "users"
  add_foreign_key "audit_logs", "users"
  add_foreign_key "collaborators", "users"
  add_foreign_key "contractor_employees", "contractors"
  add_foreign_key "contractor_employees", "users", column: "employee_id"
  add_foreign_key "contractor_infos", "contractors"
  add_foreign_key "contractor_onboards", "contractors"
  add_foreign_key "contractor_onboards",
                  "permit_applications",
                  column: "onboard_application_id"
  add_foreign_key "contractor_onboards", "users", column: "deactivated_by"
  add_foreign_key "contractor_onboards", "users", column: "suspended_by"
  add_foreign_key "contractors", "users", column: "contact_id"
  add_foreign_key "early_access_previews", "users", column: "previewer_id"
  add_foreign_key "external_api_keys", "jurisdictions"
  add_foreign_key "external_api_keys", "programs"
  add_foreign_key "external_api_keys", "sandboxes"
  add_foreign_key "integration_mapping_notifications", "template_versions"
  add_foreign_key "integration_mappings", "jurisdictions"
  add_foreign_key "integration_mappings", "template_versions"
  add_foreign_key "jurisdiction_memberships", "jurisdictions"
  add_foreign_key "jurisdiction_memberships", "users"
  add_foreign_key "jurisdiction_template_version_customizations",
                  "jurisdictions"
  add_foreign_key "jurisdiction_template_version_customizations", "sandboxes"
  add_foreign_key "jurisdiction_template_version_customizations",
                  "template_versions"
  add_foreign_key "jurisdictions",
                  "jurisdictions",
                  column: "regional_district_id"
  add_foreign_key "permit_applications", "jurisdictions"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "activity_id"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "audience_type_id"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "permit_type_id"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "submission_type_id"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "submission_variant_id"
  add_foreign_key "permit_applications",
                  "permit_classifications",
                  column: "user_group_type_id"
  add_foreign_key "permit_applications", "programs"
  add_foreign_key "permit_applications", "sandboxes"
  add_foreign_key "permit_applications", "template_versions"
  add_foreign_key "permit_block_statuses", "permit_applications"
  add_foreign_key "permit_classifications",
                  "permit_classifications",
                  column: "parent_id"
  add_foreign_key "permit_collaborations", "collaborators"
  add_foreign_key "permit_collaborations", "permit_applications"
  add_foreign_key "permit_type_required_steps", "jurisdictions"
  add_foreign_key "permit_type_required_steps",
                  "permit_classifications",
                  column: "permit_type_id"
  add_foreign_key "permit_type_submission_contacts", "jurisdictions"
  add_foreign_key "permit_type_submission_contacts",
                  "permit_classifications",
                  column: "permit_type_id"
  add_foreign_key "preferences", "users"
  add_foreign_key "program_classification_memberships",
                  "permit_classifications",
                  column: "submission_type_id"
  add_foreign_key "program_classification_memberships",
                  "permit_classifications",
                  column: "user_group_type_id"
  add_foreign_key "program_classification_memberships", "program_memberships"
  add_foreign_key "program_memberships", "programs"
  add_foreign_key "program_memberships", "users"
  add_foreign_key "requirement_template_sections",
                  "requirement_template_sections",
                  column: "copied_from_id"
  add_foreign_key "requirement_template_sections", "requirement_templates"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "activity_id"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "audience_type_id"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "permit_type_id"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "submission_type_id"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "submission_variant_id"
  add_foreign_key "requirement_templates",
                  "permit_classifications",
                  column: "user_group_type_id"
  add_foreign_key "requirement_templates", "programs"
  add_foreign_key "requirement_templates",
                  "requirement_templates",
                  column: "copied_from_id"
  add_foreign_key "requirement_templates", "users", column: "assignee_id"
  add_foreign_key "requirements", "requirement_blocks"
  add_foreign_key "revision_reasons", "site_configurations"
  add_foreign_key "revision_requests", "submission_versions"
  add_foreign_key "revision_requests", "users"
  add_foreign_key "sandboxes", "jurisdictions"
  add_foreign_key "site_configurations",
                  "requirement_templates",
                  column: "small_scale_requirement_template_id"
  add_foreign_key "step_code_building_characteristics_summaries",
                  "step_code_checklists"
  add_foreign_key "step_code_checklists",
                  "permit_type_required_steps",
                  column: "step_requirement_id"
  add_foreign_key "step_code_checklists", "step_codes"
  add_foreign_key "step_code_data_entries", "step_codes"
  add_foreign_key "step_codes", "permit_applications"
  add_foreign_key "submission_versions", "permit_applications"
  add_foreign_key "support_requests",
                  "permit_applications",
                  column: "linked_application_id"
  add_foreign_key "support_requests",
                  "permit_applications",
                  column: "parent_application_id"
  add_foreign_key "support_requests", "users", column: "requested_by_id"
  add_foreign_key "supporting_documents", "permit_applications"
  add_foreign_key "supporting_documents", "submission_versions"
  add_foreign_key "taggings", "tags"
  add_foreign_key "template_section_blocks", "requirement_blocks"
  add_foreign_key "template_section_blocks", "requirement_template_sections"
  add_foreign_key "template_versions", "requirement_templates"
  add_foreign_key "template_versions", "users", column: "deprecated_by_id"
  add_foreign_key "user_addresses", "users"
  add_foreign_key "user_license_agreements",
                  "end_user_license_agreements",
                  column: "agreement_id"
end
