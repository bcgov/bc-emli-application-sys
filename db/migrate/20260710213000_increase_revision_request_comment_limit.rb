class IncreaseRevisionRequestCommentLimit < ActiveRecord::Migration[7.1]
  def up
    change_column :revision_requests, :comment, :string, limit: 1000
  end

  def down
    oversized =
      select_value(
        "SELECT 1 FROM revision_requests WHERE length(comment) > 350 LIMIT 1"
      )
    if oversized
      raise ActiveRecord::IrreversibleMigration,
            "Cannot revert to limit: 350 while comments longer than 350 characters exist"
    end

    change_column :revision_requests, :comment, :string, limit: 350
  end
end
