class IncreaseRevisionRequestCommentLimit < ActiveRecord::Migration[7.1]
  def up
    change_column :revision_requests, :comment, :string, limit: 1000
  end

  def down
    change_column :revision_requests, :comment, :string, limit: 350
  end
end
