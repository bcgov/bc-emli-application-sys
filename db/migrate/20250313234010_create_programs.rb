class CreatePrograms < ActiveRecord::Migration[7.1]
  def change
    create_table :programs, id: :uuid do |t|
      t.string :program_name, null: false
      t.string :funded_by, null: false
      t.string :description_html
      t.string :external_api_state, default: "g_off", null: false
      t.timestamps
    end
  end
end
