module Auditable
  extend ActiveSupport::Concern

  EXCLUDED_COLUMNS = %w[created_at updated_at sign_in_count current_sign_in_at last_sign_in_at]

  included do
    after_create :audit_create
    #before_update :audit_update
    around_update :audit_update
    before_destroy :audit_destroy
  end

  private

  def audit_create
    AuditLog.create!(
      table_name: self.class.table_name,
      action: "create",
      data_before: nil,
      data_after: self.attributes
    )
  end

  def audit_update
    data_before = attributes_before_change
    data_after = data_before.keys.index_with { |key| self[key] } # Only include changed fields

    return if data_before.blank? || data_before == data_after # Avoid logging if no meaningful changes
    return if changes.keys == ["updated_at"] # Skip logging if only timestamp changed

    AuditLog.create!(
      table_name: self.class.table_name,
      action: "edit",
      data_before: data_before,
      data_after: data_after
    )
  end

  def audit_destroy
    AuditLog.create!(
      table_name: self.class.table_name,
      action: "delete",
      data_before: attributes.except(*EXCLUDED_COLUMNS),
      data_after: nil
    )
  end

  def attributes_before_change
    changes
      .except(*EXCLUDED_COLUMNS)  # Remove excluded columns
      .transform_values(&:first)  # Get only the "before" values
  end

end
