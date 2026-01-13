class ChangeReasonColumnsToTextInContractorOnboards < ActiveRecord::Migration[
  7.1
]
  def change
    change_column :contractor_onboards, :suspended_reason, :text
    change_column :contractor_onboards, :deactivated_reason, :text
  end
end
