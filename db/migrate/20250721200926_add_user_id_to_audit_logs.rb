class AddUserIdToAuditLogs < ActiveRecord::Migration[7.1]
  def change
    add_column :audit_logs, :user_id, :uuid
    add_foreign_key :audit_logs, :users
    add_index :audit_logs, :user_id
  end
end
