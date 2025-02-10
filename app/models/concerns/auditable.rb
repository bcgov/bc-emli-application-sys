module Auditable
  extend ActiveSupport::Concern

  EXCLUDED_COLUMNS = %w[id user_id created_at updated_at sign_in_count current_sign_in_at last_sign_in_at]

  included do
    after_create :audit_create
    before_update :store_previous_values
    after_update :audit_update
    before_destroy :audit_destroy
  end

  private

  def store_previous_values
    @previous_values = changes.except(*EXCLUDED_COLUMNS).transform_values(&:first) # 🔥 Capture before-update values
    puts "DEBUG: Stored previous values: #{@previous_values.inspect}"  # Debugging
  end

  def audit_create
    filtered_data_after = self.attributes.except(*EXCLUDED_COLUMNS)  # 🔥 Remove unwanted fields

    AuditLog.create!(
      table_name: self.class.table_name,
      action: "create",
      data_before: nil,
      data_after: filtered_data_after  # 🔹 Only store relevant fields
    )
  end

  def audit_update
    data_before = @previous_values || {}  # 🔹 Use captured values
    data_after = data_before.keys.index_with { |key| self[key] }  # 🔹 Capture new values

    puts "DEBUG: audit_update is running for #{self.class.name} (ID: #{self.id})"
    puts "DEBUG: previous_values = #{data_before.inspect}"
    puts "DEBUG: data_after = #{data_after.inspect}"

    return if data_before.blank? || data_before == data_after  # Avoid logging if no meaningful changes

    puts "DEBUG: Creating audit log for #{self.class.name}"

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
      .except(*EXCLUDED_COLUMNS)  # 🔹 Remove excluded columns like timestamps
      .transform_values { |change| change[0] }  # 🔥 Explicitly get the first element (old value)
  end

end
