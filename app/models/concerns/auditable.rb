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

  def store_previous_values
    @previous_values =
      changes.except(*EXCLUDED_COLUMNS).transform_values(&:first)
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
    AuditLog.create!(
      table_name: self.class.table_name,
      action: action,
      data_before: data_before,
      data_after: data_after,
      user_id: current_audit_user&.id
    )
  rescue ActiveRecord::InvalidForeignKey,
         ActiveModel::UnknownAttributeError => e
    Rails.logger.warn "Audit log creation failed (#{e.class}): #{e.message}"
    AuditLog.create!(
      table_name: self.class.table_name,
      action: action,
      data_before: data_before,
      data_after: data_after,
      user_id: nil
    )
  end

  def filtered_attributes
    attributes.except(*EXCLUDED_COLUMNS)
  end

  def current_audit_user
    Current.user if defined?(Current)
  end
end
