class AddParentIdToPermitClassifications < ActiveRecord::Migration[7.1]
  def change
    add_column :permit_classifications, :parent_id, :uuid
    add_index :permit_classifications, :parent_id
    add_foreign_key :permit_classifications,
                    :permit_classifications,
                    column: :parent_id
  end
end
