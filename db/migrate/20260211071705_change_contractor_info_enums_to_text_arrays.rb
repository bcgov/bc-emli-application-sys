class ChangeContractorInfoEnumsToTextArrays < ActiveRecord::Migration[7.1]
  def change
    change_column :contractor_infos,
                  :type_of_business,
                  :text,
                  array: true,
                  default: [],
                  using: "ARRAY[]::text[]"

    change_column :contractor_infos,
                  :primary_program_measure,
                  :text,
                  array: true,
                  default: [],
                  using: "ARRAY[]::text[]"

    change_column :contractor_infos,
                  :retrofit_enabling_measures,
                  :text,
                  array: true,
                  default: [],
                  using: "ARRAY[]::text[]"

    change_column :contractor_infos,
                  :service_languages,
                  :text,
                  array: true,
                  default: [],
                  using: "ARRAY[]::text[]"
  end
end
