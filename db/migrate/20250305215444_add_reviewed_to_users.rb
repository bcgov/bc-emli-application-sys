class AddReviewedToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :reviewed, :boolean, default: false, null: false
  end
end
