class AddPermitApplicationsCountToPrograms < ActiveRecord::Migration[7.1]
  def change
    add_column :programs,
               :permit_applications_count,
               :integer,
               default: 0,
               null: false
  end
end
