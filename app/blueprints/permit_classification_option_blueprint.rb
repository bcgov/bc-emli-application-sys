class PermitClassificationOptionBlueprint < OptionBlueprint
  fields :label

  association :value, blueprint: PermitClassificationBlueprint, view: :base
end
