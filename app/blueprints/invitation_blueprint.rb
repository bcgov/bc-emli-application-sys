class InvitationBlueprint < Blueprinter::Base
  field :reinvited do |hash, _options|
    hash[:reinvited].present? ? UserBlueprint.render_as_hash(hash[:reinvited], view: :base) : []
  end

  field :invited do |hash, _options|
    hash[:invited].present? ? UserBlueprint.render_as_hash(hash[:invited], view: :base) : []
  end

  field :email_taken_active do |hash, _options|
    hash[:email_taken_active].present? ? UserBlueprint.render_as_hash(hash[:email_taken_active], view: :base) : []
  end

  field :email_taken_pending do |hash, _options|
    hash[:email_taken_pending].present? ? UserBlueprint.render_as_hash(hash[:email_taken_pending], view: :base) : []
  end

  field :email_taken_deactivated do |hash, _options|
    hash[:email_taken_deactivated].present? ? UserBlueprint.render_as_hash(hash[:email_taken_deactivated], view: :base) : []
  end
end
