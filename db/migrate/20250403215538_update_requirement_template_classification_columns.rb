class UpdateRequirementTemplateClassificationColumns < ActiveRecord::Migration[
  7.1
]
  def change
    rename_column :requirement_templates, :user_type_id, :user_group_type_id
    add_foreign_key :requirement_templates,
                    :permit_classifications,
                    column: :user_group_type_id
    rename_column :requirement_templates, :program_type_id, :audience_type_id
    add_foreign_key :requirement_templates,
                    :permit_classifications,
                    column: :audience_type_id
    add_reference :requirement_templates,
                  :submission_type,
                  foreign_key: {
                    to_table: :permit_classifications
                  },
                  type: :uuid
  end
end
