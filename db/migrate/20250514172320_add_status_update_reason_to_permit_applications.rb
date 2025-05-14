class AddStatusUpdateReasonToPermitApplications < ActiveRecord::Migration[7.1]
  def change
    add_column :permit_applications, :status_update_reason, :text
  end
end
