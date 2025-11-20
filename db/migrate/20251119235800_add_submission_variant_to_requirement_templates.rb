class AddSubmissionVariantToRequirementTemplates < ActiveRecord::Migration[7.1]
  def change
    add_column :requirement_templates, :submission_variant_id, :uuid
    add_index :requirement_templates, :submission_variant_id
    add_foreign_key :requirement_templates,
                    :permit_classifications,
                    column: :submission_variant_id
  end
end
