class ContractorStatusEventBlueprint < Blueprinter::Base
  view :base do
    identifier :id

    fields :event_type, :reason, :created_at

    association :performed_by, blueprint: UserBlueprint, view: :minimal
  end
end
