class AddUserAndProgramTypeIdToRequirementTemplates < ActiveRecord::Migration[7.1]
  def change
    add_column :requirement_templates, :user_type_id, :uuid
    add_column :requirement_templates, :program_type_id, :uuid
    change_column_null :requirement_templates, :permit_type_id, true
  end
end
