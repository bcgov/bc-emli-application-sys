class SubmitterBlueprint < Blueprinter::Base
  def self.render(obj, view: :minimal, **options)
    return nil if obj.nil?

    case obj
    when User
      UserBlueprint.render_as_hash(obj, view: view, **options).merge(
        type: "User"
      )
    when Contractor
      ContractorBlueprint.render_as_hash(obj, view: view, **options).merge(
        type: "Contractor"
      )
    else
      {}
    end
  end
end
