class ProgramOptionBlueprint < OptionBlueprint
  fields :label

  association :value, blueprint: ProgramBlueprint, view: :base
end
