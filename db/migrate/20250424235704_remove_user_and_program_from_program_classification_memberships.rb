class RemoveUserAndProgramFromProgramClassificationMemberships < ActiveRecord::Migration[
  7.1
]
  def change
    remove_column :program_classification_memberships, :user_id
    remove_column :program_classification_memberships, :program_id
    remove_column :program_classification_memberships, :deactivated_at
  end
end
