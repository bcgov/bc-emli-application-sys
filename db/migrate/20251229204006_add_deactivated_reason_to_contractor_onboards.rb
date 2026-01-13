class AddDeactivatedReasonToContractorOnboards < ActiveRecord::Migration[7.1]
  def change
    add_column :contractor_onboards, :deactivated_reason, :string
  end
end
