class CreateApplicationAssignments < ActiveRecord::Migration[7.1]
  def change
    create_table :application_assignments, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :permit_application, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end
  end
end
