class AddSubmissionVariantToPermitApplications < ActiveRecord::Migration[7.1]
  def change
    add_column :permit_applications, :submission_variant_id, :uuid, null: true
    add_index :permit_applications, :submission_variant_id
    add_foreign_key :permit_applications,
                    :permit_classifications,
                    column: :submission_variant_id
  end
end
