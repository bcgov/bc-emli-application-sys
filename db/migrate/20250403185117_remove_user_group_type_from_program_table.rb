class RemoveUserGroupTypeFromProgramTable < ActiveRecord::Migration[7.1]
  def change
    remove_column :programs, :user_group_type, :string
  end
end
