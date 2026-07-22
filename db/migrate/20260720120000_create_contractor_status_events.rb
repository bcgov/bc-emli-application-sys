class CreateContractorStatusEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :contractor_status_events, id: :uuid do |t|
      t.references :contractor,
                   null: false,
                   foreign_key: true,
                   type: :uuid,
                   index: false
      t.references :contractor_onboard,
                   null: false,
                   foreign_key: true,
                   type: :uuid
      t.references :performed_by,
                   null: true,
                   foreign_key: {
                     to_table: :users
                   },
                   type: :uuid
      t.string :event_type, null: false
      t.text :reason

      t.timestamps
    end

    # History is always queried per-contractor, newest first.
    add_index :contractor_status_events, %i[contractor_id created_at]
  end
end
