class IncreaseRevisionRequestCommentLimit < ActiveRecord::Migration[7.1]
  def up
    change_column :revision_requests, :comment, :string, limit: 1000
  end

  def down
    if RevisionRequest.where("length(comment) > 350").exists?
      raise ActiveRecord::IrreversibleMigration,
            "Cannot revert to limit: 350 while comments longer than 350 characters exist"
    end

    change_column :revision_requests, :comment, :string, limit: 350
  end
end
