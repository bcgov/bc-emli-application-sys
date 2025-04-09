class ChangePermitApplicationsNumberIndex < ActiveRecord::Migration[7.1]
  def change
    remove_index :permit_applications,
                 name: "index_permit_applications_on_number"

    add_index :permit_applications,
              %i[program_id number],
              unique: true,
              name: "index_permit_applications_on_program_id_and_number"
  end
end
