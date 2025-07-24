module AuditLogHelper
  def self.format_changes(audit_log)
    case audit_log.action
    when "create"
      format_create_changes(audit_log)
    when "edit", "update"
      format_update_changes(audit_log)
    when "delete"
      format_delete_changes(audit_log)
    when "login"
      format_login_changes(audit_log)
    else
      [audit_log.action.humanize]
    end
  end

  private

  def self.format_create_changes(audit_log)
    return [t("audit_log.created_record")] unless audit_log.data_after

    changes = []
    audit_log.data_after.each do |key, value|
      next if skip_field?(key) || skip_value?(value)
      changes << t(
        "audit_log.created_with_field",
        field: key.humanize,
        value: format_value(value)
      )
    end
    changes.empty? ? [t("audit_log.created_record")] : changes
  end

  def self.format_update_changes(audit_log)
    unless audit_log.data_before && audit_log.data_after
      return [t("audit_log.updated_record")]
    end

    changes = []
    audit_log.data_after.each do |key, new_value|
      old_value = audit_log.data_before[key]
      next if old_value == new_value || skip_field?(key)
      # Only skip if BOTH values should be skipped (to show meaningful changes)
      next if skip_value?(old_value) && skip_value?(new_value)

      changes << t(
        "audit_log.changed_field",
        field: key.humanize,
        from: format_value(old_value),
        to: format_value(new_value)
      )
    end
    changes.empty? ? [t("audit_log.updated_record")] : changes
  end

  def self.format_delete_changes(audit_log)
    return [t("audit_log.deleted_record")] unless audit_log.data_before

    changes = []
    audit_log.data_before.each do |key, value|
      next if skip_field?(key) || skip_value?(value)
      changes << t(
        "audit_log.removed_field",
        field: key.humanize,
        value: format_value(value)
      )
    end
    changes.empty? ? [t("audit_log.deleted_record")] : changes
  end

  def self.format_login_changes(audit_log)
    return [t("audit_log.user_logged_in")] unless audit_log.data_after

    changes = [t("audit_log.user_logged_in")]

    if audit_log.data_after["current_sign_in_ip"]
      changes << t(
        "audit_log.login_from_ip",
        ip: audit_log.data_after["current_sign_in_ip"]
      )
    end

    if audit_log.data_after["sign_in_count"]
      changes << t(
        "audit_log.login_count",
        count: audit_log.data_after["sign_in_count"]
      )
    end

    changes
  end

  def self.format_value(value)
    return "nil" if value.nil?
    if value.is_a?(String) || value.is_a?(Numeric) || value.is_a?(TrueClass) ||
         value.is_a?(FalseClass)
      return value.to_s
    end

    # Handle Hash objects (like our audit data)
    return value.to_json if value.is_a?(Hash) || value.is_a?(Array)

    # Only check for date pattern on strings
    if value.is_a?(String) &&
         value.match?(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      return Time.parse(value).strftime("%Y-%m-%d %H:%M")
    end

    value.to_s.truncate(50)
  end

  def self.skip_field?(field)
    # Skip system fields and internal fields that aren't useful for auditing
    skipped_fields = %w[
      id
      created_at
      updated_at
      user_id
      encrypted_password
      reset_password_token
      reset_password_sent_at
      remember_created_at
      confirmation_token
      confirmed_at
      confirmation_sent_at
      unconfirmed_email
      invitation_token
      invitation_created_at
      invitation_sent_at
      invitation_accepted_at
      invitation_limit
      invited_by_id
      invited_by_type
      invitations_count
      sign_in_count
      current_sign_in_at
      last_sign_in_at
      current_sign_in_ip
      last_sign_in_ip
    ]
    skipped_fields.include?(field.to_s)
  end

  def self.skip_value?(value)
    # Skip null values, empty strings, and default false values for less noise
    value.nil? || value == "" || value == false || value == 0
  end

  def self.t(key, **options)
    I18n.t(key, **options)
  rescue I18n::MissingTranslationData
    # Fallback to English text if translation is missing
    case key
    when "audit_log.created_record"
      "Record created"
    when "audit_log.created_with_field"
      "Created with #{options[:field]}: #{options[:value]}"
    when "audit_log.updated_record"
      "Record updated"
    when "audit_log.changed_field"
      "Changed #{options[:field]} from #{options[:from]} to #{options[:to]}"
    when "audit_log.deleted_record"
      "Record deleted"
    when "audit_log.removed_field"
      "Removed #{options[:field]}: #{options[:value]}"
    when "audit_log.user_logged_in"
      "User logged in"
    when "audit_log.login_from_ip"
      "Login from IP: #{options[:ip]}"
    when "audit_log.login_count"
      "Total logins: #{options[:count]}"
    else
      key
    end
  end
end
