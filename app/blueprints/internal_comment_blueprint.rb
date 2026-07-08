class InternalCommentBlueprint < Blueprinter::Base
  view :base do
    identifier :id

    fields :body, :created_at

    association :user, blueprint: UserBlueprint, view: :minimal
  end
end
