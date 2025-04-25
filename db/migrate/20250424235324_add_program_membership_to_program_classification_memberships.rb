class AddProgramMembershipToProgramClassificationMemberships < ActiveRecord::Migration[
  7.1
]
  def change
    add_reference :program_classification_memberships,
                  :program_membership,
                  type: :uuid,
                  foreign_key: true,
                  index: true

    # index for querying by user/program directly
    add_index :program_classification_memberships, %i[user_id program_id]
  end
end
