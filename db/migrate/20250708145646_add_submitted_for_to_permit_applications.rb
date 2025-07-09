class AddSubmittedForToPermitApplications < ActiveRecord::Migration[7.1]
  def change
    add_column :permit_applications, :submitted_for, :string
  end
end
