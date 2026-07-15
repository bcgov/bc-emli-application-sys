class AddRecordIdToAuditLogs < ActiveRecord::Migration[8.1]
  def change
    add_column :audit_logs, :record_id, :uuid
    add_index :audit_logs, %i[table_name record_id]
  end
end
