class CreateContractorImports < ActiveRecord::Migration[7.1]
  def change
    create_table :contractor_imports, id: :uuid do |t|
      t.jsonb :payload, null: false
      t.string :invite_code, null: false

      # ownership / lifecycle tracking
      t.datetime :consumed_at
      t.uuid :consumed_by_user_id
      t.uuid :contractor_id

      t.timestamps
    end

    add_index :contractor_imports, :invite_code, unique: true
    add_index :contractor_imports, :payload, using: :gin
    add_index :contractor_imports, :consumed_at
    add_index :contractor_imports, :contractor_id
  end
end
