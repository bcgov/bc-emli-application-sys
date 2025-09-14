class MakeApplicationSubmitterPolymorphic < ActiveRecord::Migration[7.1]
  def change
    # drop the old FK reference to users
    remove_reference :permit_applications,
                     :submitter,
                     foreign_key: {
                       to_table: :users
                     }

    # add new polymorphic association to users and contractors
    add_reference :permit_applications,
                  :submitter,
                  polymorphic: true,
                  type: :uuid,
                  null: false
  end
end
