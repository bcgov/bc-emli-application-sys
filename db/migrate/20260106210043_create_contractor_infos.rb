class CreateContractorInfos < ActiveRecord::Migration[7.1]
  def change
    create_table :contractor_infos,
                 id: :uuid,
                 default: -> { "gen_random_uuid()" } do |t|
      t.uuid :contractor_id, null: false

      t.string :doing_business_as
      t.string :license_issuer
      t.string :license_number
      t.integer :incorporated_year
      t.integer :number_of_employees
      t.string :gst_number
      t.string :worksafebc_number

      t.integer :type_of_business, array: true, default: [], null: false
      t.integer :primary_program_measure, array: true, default: [], null: false
      t.integer :retrofit_enabling_measures, array: true, default: []

      t.string :service_languages

      t.timestamps
    end

    add_index :contractor_infos, :contractor_id, unique: true
    add_foreign_key :contractor_infos, :contractors
  end
end
