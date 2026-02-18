class AddResolvedAtToRevisionRequests < ActiveRecord::Migration[7.1]
  def change
    add_column :revision_requests, :resolved_at, :datetime
  end
end
