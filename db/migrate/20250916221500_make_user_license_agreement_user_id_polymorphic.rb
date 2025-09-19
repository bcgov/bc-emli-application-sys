class MakeUserLicenseAgreementUserIdPolymorphic < ActiveRecord::Migration[7.1]
  def change
    # remove old foreign key, but keep the user_id column intermittently
    remove_foreign_key :user_license_agreements, column: :user_id

    # rename the existing column so we can port the data
    rename_column :user_license_agreements, :user_id, :old_user_id

    # add the new polymorphic references (allow nulls temporarily)
    add_reference :user_license_agreements,
                  :account,
                  polymorphic: true,
                  type: :uuid,
                  null: true,
                  index: false

    # backfill existing rows with old IDs, assume all were Users
    reversible { |dir| dir.up { execute <<-SQL.squish } }
          UPDATE user_license_agreements
          SET account_id = old_user_id,
              account_type = 'User'
          WHERE old_user_id IS NOT NULL
        SQL

    # now enforce NOT NULL
    change_column_null :user_license_agreements, :account_id, false
    change_column_null :user_license_agreements, :account_type, false

    # drop the old column were done with it
    remove_column :user_license_agreements, :old_user_id
  end
end
