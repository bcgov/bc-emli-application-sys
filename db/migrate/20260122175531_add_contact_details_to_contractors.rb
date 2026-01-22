class AddContactDetailsToContractors < ActiveRecord::Migration[7.1]
  def change
    add_column :contractors, :cellphone_number, :string
    add_column :contractors, :street_address, :string
    add_column :contractors, :city, :string
    add_column :contractors, :postal_code, :string
    add_column :contractors, :email, :string
  end
end
