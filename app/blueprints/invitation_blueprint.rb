class InvitationBlueprint < Blueprinter::Base
  field :reinvited do |hash, _options|
    UserBlueprint.render_as_hash(hash[:reinvited], view: :base)
  end

  field :invited do |hash, _options|
    UserBlueprint.render_as_hash(hash[:invited], view: :base)
  end

  field :email_taken_active do |hash, _options|
    UserBlueprint.render_as_hash(hash[:email_taken_active], view: :base)
  end

  field :email_taken_deactivated do |hash, _options|
    UserBlueprint.render_as_hash(hash[:email_taken_deactivated], view: :base)
  end
end
