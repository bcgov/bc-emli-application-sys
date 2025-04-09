class UpdatePermitApplicationColumns < ActiveRecord::Migration[7.1]
  def change
    # Make existing columns nullable
    change_column_null :permit_applications, :jurisdiction_id, true
    change_column_null :permit_applications, :permit_type_id, true
    change_column_null :permit_applications, :activity_id, true

    # Add new UUID foreign key references with indexes
    add_reference :permit_applications,
                  :program,
                  type: :uuid,
                  foreign_key: true,
                  index: true
    add_reference :permit_applications,
                  :user_group_type,
                  type: :uuid,
                  foreign_key: {
                    to_table: :permit_classifications
                  },
                  index: true
    add_reference :permit_applications,
                  :audience_type,
                  type: :uuid,
                  foreign_key: {
                    to_table: :permit_classifications
                  },
                  index: true
    add_reference :permit_applications,
                  :submission_type,
                  type: :uuid,
                  foreign_key: {
                    to_table: :permit_classifications
                  },
                  index: true
  end
end
