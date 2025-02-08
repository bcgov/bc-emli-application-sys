class CreateAuditLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :audit_logs, id: :uuid do |t|
      t.string :table_name
      t.string :action
      t.jsonb :data_before
      t.jsonb :data_after

      t.timestamps
    end
  end
end
