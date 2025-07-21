class AddIndexesToAuditLogs < ActiveRecord::Migration[7.1]
  def change
    # For table-specific queries with time ranges
    add_index :audit_logs,
              %i[table_name created_at],
              name: "idx_audit_logs_table_created"

    # For action-specific queries
    add_index :audit_logs, :action, name: "idx_audit_logs_action"

    # For chronological queries (most common query pattern)
    add_index :audit_logs, :created_at, name: "idx_audit_logs_created_at"

    # For user activity queries
    add_index :audit_logs,
              %i[user_id created_at],
              name: "idx_audit_logs_user_created",
              where: "user_id IS NOT NULL"
  end
end
