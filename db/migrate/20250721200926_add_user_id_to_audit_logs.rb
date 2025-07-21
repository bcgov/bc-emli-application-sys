class AddUserIdToAuditLogs < ActiveRecord::Migration[7.1]
  def up
    add_column :audit_logs, :user_id, :uuid
    add_foreign_key :audit_logs, :users
    add_index :audit_logs, :user_id
  end

  def down
    remove_index :audit_logs, :user_id
    remove_foreign_key :audit_logs, :users
    remove_column :audit_logs, :user_id
  end
end
