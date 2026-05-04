class AddScreenedInAtToPermitApplications < ActiveRecord::Migration[7.1]
  def change
    add_column :permit_applications, :screened_in_at, :datetime
  end
end
