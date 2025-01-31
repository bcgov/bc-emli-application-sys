class RemoveAddressFromUsers < ActiveRecord::Migration[7.1]
  def change
    remove_column :users, :address, :text
  end
end
