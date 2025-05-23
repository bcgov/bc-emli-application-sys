class AddUniquenessConstraintToApplicationAssignments < ActiveRecord::Migration[
  7.1
]
  def change
    add_index :application_assignments,
              %i[user_id permit_application_id],
              unique: true,
              name: "index_application_assignments_on_user_and_permit"
  end
end
