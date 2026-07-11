class IncreaseRevisionRequestCommentLimit < ActiveRecord::Migration[7.1]
  def change
    change_column :revision_requests, :comment, :string, limit: 1000
  end
end
