class UpdateExternalApiKeys < ActiveRecord::Migration[7.1]
  def change
    change_column_null :external_api_keys, :jurisdiction_id, true
    add_reference :external_api_keys, :program, type: :uuid, foreign_key: true
  end
end
