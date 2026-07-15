module AuditLogHelper
  # Batch-preloads every User/ContractorOnboard that a page of AuditLog rows
  # could reference (subject-line targets AND *_by/user_id values inside the
  # diffs), so format_changes doesn't do a find_by per row per field. Call
  # once before rendering/exporting a collection; always pair with
  # clear_preload (ensure) so nothing leaks into a later request on the same
  # Puma thread. Callers that skip this (e.g. specs calling format_changes
  # directly) still work correctly - cached_user/cached_contractor_onboard
  # fall back to a live single query when no preload is active.
  def self.preload_for(audit_logs)
    audit_logs = audit_logs.to_a
    user_ids = []
    contractor_onboard_ids = []
    permit_application_ids = []

    audit_logs.each do |log|
      case log.table_name
      when "users"
        user_ids << log.record_id if log.record_id.present?
      when "contractor_onboards"
        contractor_onboard_ids << log.record_id if log.record_id.present?
      when "permit_applications"
        permit_application_ids << log.record_id if log.record_id.present?
      end

      [log.data_before, log.data_after].each do |data|
        next unless data.is_a?(Hash)

        data.each do |key, value|
          next unless value.is_a?(String) && value.match?(UUID_PATTERN)
          next unless key.to_s.match?(/(_by|^user_id)\z/)

          user_ids << value
        end
      end
    end

    Thread.current[:audit_log_user_cache] = User.where(
      id: user_ids.uniq
    ).index_by(&:id)
    Thread.current[:audit_log_contractor_onboard_cache] = ContractorOnboard
      .includes(:contractor)
      .where(id: contractor_onboard_ids.uniq)
      .index_by(&:id)
    Thread.current[
      :audit_log_permit_application_cache
    ] = PermitApplication.where(id: permit_application_ids.uniq).index_by(&:id)

    audit_logs
  end

  def self.clear_preload
    Thread.current[:audit_log_user_cache] = nil
    Thread.current[:audit_log_contractor_onboard_cache] = nil
    Thread.current[:audit_log_permit_application_cache] = nil
  end

  def self.format_changes(audit_log)
    changes =
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

    subject = subject_line(audit_log)
    subject ? [subject] + changes : changes
  end

  private

  # Identifies WHICH record was affected, for tables where the diff alone
  # doesn't say (e.g. an "edit" that only touches non-identifying columns
  # like discarded_at, or a contractor_onboards row where contractor_id
  # never changes so never appears in the diff). Resolves for :users,
  # :contractor_onboards, and :permit_applications today; other tables' diffs
  # already tend to carry identifying context (name, body, etc.) via create/delete's full-attribute
  # snapshot.
  def self.subject_line(audit_log)
    return nil unless audit_log.record_id.present?

    case audit_log.table_name
    when "users"
      user = cached_user(audit_log.record_id)
      return t("audit_log.deleted_user_subject") unless user

      t("audit_log.user_subject", name: user.name, email: user.email)
    when "contractor_onboards"
      contractor = cached_contractor_onboard(audit_log.record_id)&.contractor
      return t("audit_log.deleted_contractor_subject") unless contractor

      t(
        "audit_log.contractor_subject",
        business_name: contractor.business_name,
        number: contractor.number
      )
    when "permit_applications"
      application = cached_permit_application(audit_log.record_id)
      return t("audit_log.deleted_application_subject") unless application

      t(
        "audit_log.application_subject",
        nickname: application.nickname,
        number: application.number
      )
    end
  end

  def self.cached_user(id)
    return nil if id.blank?

    cache = Thread.current[:audit_log_user_cache]
    return User.find_by(id: id) unless cache

    # fetch's block only runs on a real miss - a well-formed preload should
    # never miss (ids come from the same batch), but fall back to a live
    # query rather than silently showing "deleted" if it somehow does.
    cache.fetch(id) { User.find_by(id: id) }
  end

  def self.cached_contractor_onboard(id)
    return nil if id.blank?

    cache = Thread.current[:audit_log_contractor_onboard_cache]
    return ContractorOnboard.find_by(id: id) unless cache

    cache.fetch(id) { ContractorOnboard.find_by(id: id) }
  end

  def self.cached_permit_application(id)
    return nil if id.blank?

    cache = Thread.current[:audit_log_permit_application_cache]
    return PermitApplication.find_by(id: id) unless cache

    cache.fetch(id) { PermitApplication.find_by(id: id) }
  end

  def self.format_create_changes(audit_log)
    return [t("audit_log.created_record")] unless audit_log.data_after

    changes = []
    audit_log.data_after.each do |key, value|
      next if skip_field?(key) || skip_value?(value)
      next if actor_duplicate?(key, value, audit_log)
      changes << t(
        "audit_log.created_with_field",
        field: key.humanize,
        value: format_value(value, key)
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
      if actor_duplicate?(key, old_value, audit_log) ||
           actor_duplicate?(key, new_value, audit_log)
        next
      end

      if old_value.is_a?(Hash) || new_value.is_a?(Hash)
        # A whole-blob truncated preview can't show what changed in a large
        # nested Hash (submission_data, compliance_data, ...) - list the
        # actual leaf fields that differ instead of dumping raw JSON. Either
        # side (not both) is enough to dispatch here - e.g. a column that
        # was nil (nullable, no default) getting its first real value -
        # leaf_diffs already treats a non-Hash side as {} and recurses.
        changes.concat(format_hash_field_changes(key, old_value, new_value))
      else
        changes << format_changed_line(key.humanize, old_value, new_value, key)
      end
    end
    changes.empty? ? [t("audit_log.updated_record")] : changes
  end

  MAX_LEAF_DIFFS = 20

  def self.format_hash_field_changes(field_key, old_hash, new_hash)
    diffs = leaf_diffs(old_hash, new_hash)
    if diffs.empty?
      return [
        t("audit_log.changed_field_no_visible_diff", field: field_key.humanize)
      ]
    end

    lines =
      diffs
        .first(MAX_LEAF_DIFFS)
        .map do |path, old_v, new_v|
          format_changed_line("#{field_key.humanize}.#{path}", old_v, new_v)
        end

    if diffs.size > MAX_LEAF_DIFFS
      lines << t(
        "audit_log.more_field_changes",
        count: diffs.size - MAX_LEAF_DIFFS
      )
    end

    lines
  end

  # Shared by top-level scalar/array field diffs and nested leaf diffs (from
  # format_hash_field_changes), so the truncated-preview-collision check
  # applies consistently at every level, not just the top one. field_name is
  # only passed for real column-level diffs (for *_by/user_id FK
  # resolution) - nested leaf paths aren't real column names, so callers
  # pass nil there.
  def self.format_changed_line(
    field_label,
    old_value,
    new_value,
    field_name = nil
  )
    from = format_value(old_value, field_name)
    to = format_value(new_value, field_name)

    if from == to && (old_value.is_a?(Hash) || old_value.is_a?(Array))
      t("audit_log.changed_field_truncated_identical", field: field_label)
    else
      t("audit_log.changed_field", field: field_label, from: from, to: to)
    end
  end

  # form.io submission blobs (submission_data) carry these as siblings of the
  # real form content ("data") - pure library/browser bookkeeping (session
  # telemetry, an internal note field, form.io's own submission-state
  # concept distinct from the app's own `status` column), never something an
  # admin would want in an audit trail. Skipped at any nesting depth inside
  # leaf_diffs since these key names don't collide with real form field
  # names (those are always the long formSubmissionDataRST... composite
  # keys, never plain words like these).
  NOISE_KEYS = %w[metadata _vnote state].freeze

  # Recursively finds leaf-level differences between two Hashes. Arrays are
  # compared as whole values (not recursed into) - form data arrays are
  # typically short lists (file uploads, checkbox selections), and diffing
  # them element-by-element adds real complexity (index alignment on
  # insert/delete) for a case that hasn't shown up in practice.
  def self.leaf_diffs(old_val, new_val, path = [])
    old_is_hash = old_val.is_a?(Hash)
    new_is_hash = new_val.is_a?(Hash)

    # Recurse whenever EITHER side is a Hash, treating a missing/nil other
    # side as empty - otherwise a wholly new (or removed) nested section
    # (old_val nil, new_val a Hash) can't be compared key-by-key and shows
    # up as one opaque blob instead of its actual field-level values. This
    # is exactly the "first full form submission" case: everything nested
    # under a brand-new section is nil on the old side.
    if old_is_hash || new_is_hash
      old_h = old_is_hash ? old_val : {}
      new_h = new_is_hash ? new_val : {}
      (old_h.keys | new_h.keys).flat_map do |k|
        next [] if NOISE_KEYS.include?(k.to_s)

        leaf_diffs(old_h[k], new_h[k], path + [k])
      end
    elsif old_val != new_val
      # Same noise filter the top-level diff already applies: a field
      # sitting at nil/""/false/0 on BOTH sides of "changed" (e.g. an
      # unanswered form.io field going from missing to an explicit "" -
      # still "no answer", not a real change) isn't worth a line that shows
      # nothing useful after "to".
      return [] if skip_value?(old_val) && skip_value?(new_val)

      [[path.join("."), old_val, new_val]]
    else
      []
    end
  end

  def self.format_delete_changes(audit_log)
    return [t("audit_log.deleted_record")] unless audit_log.data_before

    changes = []
    audit_log.data_before.each do |key, value|
      next if skip_field?(key) || skip_value?(value)
      next if actor_duplicate?(key, value, audit_log)
      changes << t(
        "audit_log.removed_field",
        field: key.humanize,
        value: format_value(value, key)
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

  UUID_PATTERN =
    /\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i
  MAX_JSON_PREVIEW_LENGTH = 200

  # The WHO column already shows the acting user (audit_log.user_id). Any
  # *_by/user_id-shaped field whose value happens to BE that same actor would
  # just repeat it in Details, so drop that line entirely. Dynamic (compares
  # actual values) rather than a static field-name list, so it holds for any
  # Auditable model/column, not just the ones we've seen so far - and still
  # shows the field on the rare occasion it genuinely differs from the actor.
  def self.actor_duplicate?(field, value, audit_log)
    return false unless value.is_a?(String) && value.match?(UUID_PATTERN)
    return false unless field.to_s.match?(/(_by|^user_id)\z/)

    audit_log.user_id.present? && value == audit_log.user_id
  end

  def self.format_value(value, field_name = nil)
    return "nil" if value.nil?

    if field_name && value.is_a?(String) && value.match?(UUID_PATTERN) &&
         field_name.to_s.match?(/(_by|^user_id)\z/)
      resolved = cached_user(value)
      return "#{resolved.name} (#{resolved.email})" if resolved
    end

    # Date pattern must be checked BEFORE the generic String branch below -
    # otherwise every timestamp falls through as a raw ISO string and this
    # never fires (that was the pre-existing bug: dates always rendered raw).
    # A date-SHAPED string isn't necessarily a valid date (e.g. free-text
    # form input matching the pattern by coincidence) - Time.parse raises
    # ArgumentError on those, which would otherwise crash the whole audit
    # log page render, not just this one line.
    if value.is_a?(String) &&
         value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      begin
        return Time.parse(value).strftime("%Y-%m-%d %H:%M")
      rescue ArgumentError
        # fall through to the generic string branch below
      end
    end

    if value.is_a?(String) || value.is_a?(Numeric) || value.is_a?(TrueClass) ||
         value.is_a?(FalseClass)
      return value.to_s
    end

    # Handle Hash objects (like our audit data). Truncated - some audited
    # columns (submission_data, requirement_json) are large nested blobs that
    # would otherwise dump thousands of characters into one Details line.
    if value.is_a?(Hash) || value.is_a?(Array)
      return value.to_json.truncate(MAX_JSON_PREVIEW_LENGTH)
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
    when "audit_log.changed_field_truncated_identical"
      "Changed #{options[:field]} (preview identical after truncation - see full record for the actual change)"
    when "audit_log.changed_field_no_visible_diff"
      "Changed #{options[:field]} (no field-level difference found)"
    when "audit_log.more_field_changes"
      "... and #{options[:count]} more field changes"
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
    when "audit_log.user_subject"
      "User: #{options[:name]} (#{options[:email]})"
    when "audit_log.deleted_user_subject"
      "User: (deleted)"
    when "audit_log.contractor_subject"
      "Contractor: #{options[:business_name]} (##{options[:number]})"
    when "audit_log.deleted_contractor_subject"
      "Contractor: (deleted)"
    when "audit_log.application_subject"
      "Application: #{options[:nickname]} (##{options[:number]})"
    when "audit_log.deleted_application_subject"
      "Application: (deleted)"
    else
      key
    end
  end
end
