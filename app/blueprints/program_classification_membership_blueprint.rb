class ProgramClassificationMembershipBlueprint < Blueprinter::Base
  identifier :id

  field :program_id do |pcm|
    pcm.program_membership&.program_id
  end

  field :user_id do |pcm|
    pcm.program_membership&.user_id
  end

  fields :user_group_type_id, :submission_type_id, :created_at, :updated_at

  association :program, blueprint: ProgramBlueprint
  association :user_group_type, blueprint: PermitClassificationBlueprint
  association :submission_type, blueprint: PermitClassificationBlueprint
end
