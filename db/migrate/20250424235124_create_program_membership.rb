class CreateProgramMembership < ActiveRecord::Migration[7.1]
  def change
    create_table :program_memberships, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :program, null: false, foreign_key: true, type: :uuid
      t.datetime :deactivated_at

      t.timestamps
    end

    add_index :program_memberships, %i[user_id program_id], unique: true
  end
end
