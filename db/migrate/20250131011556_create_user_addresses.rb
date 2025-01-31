class CreateUserAddresses < ActiveRecord::Migration[7.1]
  def change
    create_table :user_addresses, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :street_address
      t.string :locality
      t.string :region
      t.string :postal_code
      t.string :country
      t.string :address_type

      t.timestamps
    end
  end
end
