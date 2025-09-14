class MakeApplicationSubmitterPolymorphic < ActiveRecord::Migration[7.1]
  def change
    # remove old foreign key, but keep the submitter_id column intermittently
    remove_foreign_key :permit_applications, column: :submitter_id

    # rename the existing column so we can port the data
    rename_column :permit_applications, :submitter_id, :old_submitter_id

    # add the new polymorphic references (allow nulls temporarily)
    add_reference :permit_applications,
                  :submitter,
                  polymorphic: true,
                  type: :uuid,
                  null: true,
                  index: false

    # backfill existing rows with old IDs, assume all were Users
    reversible { |dir| dir.up { execute <<-SQL.squish } }
          UPDATE permit_applications
          SET submitter_id = old_submitter_id,
              submitter_type = 'User'
          WHERE old_submitter_id IS NOT NULL
        SQL

    # now enforce NOT NULL
    change_column_null :permit_applications, :submitter_id, false
    change_column_null :permit_applications, :submitter_type, false

    # drop the old column were done with it
    remove_column :permit_applications, :old_submitter_id
  end
end
