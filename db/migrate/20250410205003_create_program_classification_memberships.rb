class CreateProgramClassificationMemberships < ActiveRecord::Migration[7.1]
  def change
    create_table :program_classification_memberships, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :program_id, null: false
      t.uuid :user_group_type_id, null: false
      t.uuid :submission_type_id, null: true

      t.timestamps
    end

    # Foreign keys
    add_foreign_key :program_classification_memberships,
                    :users,
                    column: :user_id
    add_foreign_key :program_classification_memberships,
                    :programs,
                    column: :program_id
    add_foreign_key :program_classification_memberships,
                    :permit_classifications,
                    column: :user_group_type_id
    add_foreign_key :program_classification_memberships,
                    :permit_classifications,
                    column: :submission_type_id

    # Composite uniqueness constraint
    add_index :program_classification_memberships,
              %i[user_id program_id user_group_type_id submission_type_id],
              unique: true,
              name: "index_program_classification_memberships_unique"
  end
end
