class AddDeactivatedAtToProgramClassificationMemberships < ActiveRecord::Migration[
  7.1
]
  def change
    add_column :program_classification_memberships, :deactivated_at, :datetime
    add_index :program_classification_memberships, :deactivated_at
  end
end
