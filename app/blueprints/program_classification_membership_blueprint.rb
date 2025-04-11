class ProgramClassificationMembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :user_id,
         :program_id,
         :user_group_type_id,
         :submission_type_id,
         :created_at,
         :updated_at

  association :program, blueprint: ProgramBlueprint
  association :user_group_type, blueprint: PermitClassificationBlueprint
  association :submission_type, blueprint: PermitClassificationBlueprint
end
