class ApplicationAssignmentBlueprint < Blueprinter::Base
  # Unique identifier for the assignment
  identifier :id

  # Associations: This links to the permit_application and user, using their respective blueprints
  association :permit_application, blueprint: PermitApplicationBlueprint, view: :base
  association :user, blueprint: UserBlueprint, view: :base

  # Fields to be included in the blueprint serialization
  fields :permit_application_id, :user_id

  # Define additional views if needed (e.g., for detailed information)
  view :base do
    fields :id, :permit_application_id, :user_id
  end

  view :detailed do
    fields :id, :permit_application_id, :user_id, :created_at, :updated_at
    association :permit_application, blueprint: PermitApplicationBlueprint, view: :full
    association :user, blueprint: UserBlueprint, view: :full
  end
end
