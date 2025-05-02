class ProgramClassificationMembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :user_group_type_id, :submission_type_id, :created_at, :updated_at

  field :user_group_type_code do |pcm|
    pcm.user_group_type&.code
  end

  field :submission_type_code do |pcm|
    pcm.submission_type&.code
  end

  association :user_group_type, blueprint: PermitClassificationBlueprint
  association :submission_type, blueprint: PermitClassificationBlueprint
end
