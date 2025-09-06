class CreateContractorEmployees < ActiveRecord::Migration[7.1]
  def change
    create_table :contractor_employees, id: :uuid do |t|
      t.references :contractor, null: false, foreign_key: true, type: :uuid
      t.references :employee,
                   null: false,
                   foreign_key: {
                     to_table: :users
                   },
                   type: :uuid

      t.timestamps
    end

    # optional: prevent duplicates
    add_index :contractor_employees, %i[contractor_id employee_id], unique: true
  end
end
