class CreateContractorOnboards < ActiveRecord::Migration[7.1]
  def change
    create_table :contractor_onboards, id: :uuid do |t|
      t.references :contractor, null: false, foreign_key: true, type: :uuid
      t.references :onboard_application,
                   null: false,
                   foreign_key: {
                     to_table: :permit_applications
                   },
                   type: :uuid
      t.datetime :deactivated_at
      t.string :suspended_reason
      t.datetime :suspended_at

      t.timestamps
    end
  end
end
