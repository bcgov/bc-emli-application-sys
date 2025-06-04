class AddPerformedByToRevisionRequests < ActiveRecord::Migration[7.1]
  def change
    add_column :revision_requests, :performed_by, :string
  end
end
