class AddVirusScanFieldsToModels < ActiveRecord::Migration[7.1]
  def change
    # Add virus scan fields to supporting_documents table
    unless column_exists?(:supporting_documents, :virus_scan_status)
      add_column :supporting_documents,
                 :virus_scan_status,
                 :integer,
                 default: 0,
                 null: false
      add_column :supporting_documents, :virus_scan_message, :text
      add_column :supporting_documents, :virus_scan_started_at, :datetime
      add_column :supporting_documents, :virus_scan_completed_at, :datetime
      add_column :supporting_documents, :virus_name, :string

      add_index :supporting_documents, :virus_scan_status
      add_index :supporting_documents, :virus_scan_completed_at
    end

    # Add virus scan fields to step_codes table if it exists
    if table_exists?(:step_codes) &&
         !column_exists?(:step_codes, :virus_scan_status)
      add_column :step_codes,
                 :virus_scan_status,
                 :integer,
                 default: 0,
                 null: false
      add_column :step_codes, :virus_scan_message, :text
      add_column :step_codes, :virus_scan_started_at, :datetime
      add_column :step_codes, :virus_scan_completed_at, :datetime
      add_column :step_codes, :virus_name, :string

      add_index :step_codes, :virus_scan_status
      add_index :step_codes, :virus_scan_completed_at
    end
  end

  def down
    # Remove virus scan fields from supporting_documents
    if column_exists?(:supporting_documents, :virus_scan_status)
      remove_index :supporting_documents, :virus_scan_status
      remove_index :supporting_documents, :virus_scan_completed_at

      remove_column :supporting_documents, :virus_scan_status
      remove_column :supporting_documents, :virus_scan_message
      remove_column :supporting_documents, :virus_scan_started_at
      remove_column :supporting_documents, :virus_scan_completed_at
      remove_column :supporting_documents, :virus_name
    end

    # Remove virus scan fields from step_codes
    if table_exists?(:step_codes) &&
         column_exists?(:step_codes, :virus_scan_status)
      remove_index :step_codes, :virus_scan_status
      remove_index :step_codes, :virus_scan_completed_at

      remove_column :step_codes, :virus_scan_status
      remove_column :step_codes, :virus_scan_message
      remove_column :step_codes, :virus_scan_started_at
      remove_column :step_codes, :virus_scan_completed_at
      remove_column :step_codes, :virus_name
    end
  end
end
