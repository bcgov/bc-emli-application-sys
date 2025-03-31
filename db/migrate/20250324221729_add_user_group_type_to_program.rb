class AddUserGroupTypeToProgram < ActiveRecord::Migration[7.1]
  def change
    add_column :programs, :user_group_type, :string
  end
end
