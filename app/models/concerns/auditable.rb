module Auditable
  extend ActiveSupport::Concern

  EXCLUDED_COLUMNS = %w[
    id
    user_id
    created_at
    updated_at
    sign_in_count
    current_sign_in_at
    last_sign_in_at
  ].freeze

  included do
    after_create :audit_create
    before_update :store_previous_values
    after_update :audit_update
    before_destroy :audit_destroy
  end

  private

  # user_id is excluded by default because on most models it's redundant
  # with the audit row's own actor (AuditLog#user_id). Some models use
  # user_id for genuine domain data instead (e.g. ApplicationAssignment's
  # user_id is WHICH REVIEWER got assigned, not who performed the audited
  # action) - those models can override this to keep it. The dynamic
  # actor_duplicate? check in AuditLogHelper already suppresses it at
  # display time on the rare occasion it genuinely does equal the actor, so
  # this doesn't reintroduce WHO-duplication for the common case either.
  def audit_excluded_columns
    EXCLUDED_COLUMNS
  end

  def store_previous_values
    @previous_values =
      changes.except(*audit_excluded_columns).transform_values(&:first)
  end

  def audit_create
    create_audit_log("create", nil, filtered_attributes)
  end

  def audit_update
    data_before = @previous_values || {}
    data_after = data_before.keys.index_with { |key| self[key] }

    return if data_before.blank? || data_before == data_after

    create_audit_log("edit", data_before, data_after)
  end

  def audit_destroy
    create_audit_log("delete", filtered_attributes, nil)
  end

  def create_audit_log(action, data_before, data_after)
    attrs = {
      table_name: self.class.table_name,
      action: action,
      data_before: data_before,
      data_after: data_after,
      user_id: current_audit_user&.id
    }
    # Only stamp record_id if the column actually exists - otherwise, mid
    # rolling-deploy (app code deployed before the migration runs), this
    # would raise UnknownAttributeError on the FIRST attempt, get caught
    # below, then raise the SAME error again on the retry (since it also
    # included record_id), crashing the request instead of degrading
    # gracefully like the rescue intends.
    attrs[:record_id] = id if AuditLog.column_names.include?("record_id")

    AuditLog.create!(attrs)
  rescue ActiveRecord::InvalidForeignKey,
         ActiveModel::UnknownAttributeError => e
    Rails.logger.warn "Audit log creation failed (#{e.class}): #{e.message}"
    AuditLog.create!(attrs.merge(user_id: nil))
  end

  def filtered_attributes
    attributes.except(*audit_excluded_columns)
  end

  def current_audit_user
    Current.user if defined?(Current)
  end
end
