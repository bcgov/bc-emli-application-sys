class ChangeActivityIdNullabilityInRequirementTemplates < ActiveRecord::Migration[
  6.0
]
  def change
    change_column_null :requirement_templates, :activity_id, true
  end
end
