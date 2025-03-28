class AddProgramIdToRequirementTemplates < ActiveRecord::Migration[6.0]
  def change
    # Add program_id as a uuid reference
    add_reference :requirement_templates,
                  :program,
                  type: :uuid,
                  null: true,
                  foreign_key: true
  end
end
