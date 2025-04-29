# app/blueprints/program_membership_blueprint.rb
class ProgramMembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :user_id, :program_id, :deactivated_at
end
