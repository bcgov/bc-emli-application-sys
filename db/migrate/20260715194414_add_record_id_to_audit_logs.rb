class AddRecordIdToAuditLogs < ActiveRecord::Migration[8.1]
  # No backfill: Auditable's EXCLUDED_COLUMNS deliberately never stored `id`
  # in data_before/data_after (see app/models/concerns/auditable.rb), so
  # existing rows have no reliable source to derive record_id from. Accepted
  # tradeoff - historical audit entries keep record_id: nil and simply don't
  # get a subject line; only entries created after this migration are
  # traceable that way.
  def change
    add_column :audit_logs, :record_id, :uuid
    add_index :audit_logs, %i[table_name record_id]
  end
end
