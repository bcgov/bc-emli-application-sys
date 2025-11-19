class CreateSupportRequests < ActiveRecord::Migration[7.1]
  def change
    create_table :support_requests, id: :uuid do |t|
      t.references :parent_application,
                   null: false,
                   foreign_key: {
                     to_table: :permit_applications
                   },
                   type: :uuid
      t.references :requested_by,
                   null: false,
                   foreign_key: {
                     to_table: :users
                   },
                   type: :uuid
      t.references :linked_application,
                   foreign_key: {
                     to_table: :permit_applications
                   },
                   type: :uuid
      t.text :additional_text

      t.timestamps
    end
  end
end
