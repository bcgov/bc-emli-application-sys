class AddSuspendedByAndDeactivatedByToContractorOnboards < ActiveRecord::Migration[
  7.1
]
  def change
    add_column :contractor_onboards, :suspended_by, :uuid
    add_column :contractor_onboards, :deactivated_by, :uuid
    add_foreign_key :contractor_onboards, :users, column: :suspended_by
    add_foreign_key :contractor_onboards, :users, column: :deactivated_by
  end
end
