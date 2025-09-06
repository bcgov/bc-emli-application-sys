# db/migrate/20250905130000_create_contractors.rb
class CreateContractors < ActiveRecord::Migration[7.1]
  def change
    create_table :contractors, id: :uuid do |t|
      t.references :contact,
                   null: false,
                   foreign_key: {
                     to_table: :users
                   },
                   type: :uuid
      t.string :business_name, null: false
      t.string :website
      t.string :phone_number
      t.boolean :onboarded, null: false, default: false

      t.timestamps
    end
  end
end
