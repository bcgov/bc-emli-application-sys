class UserAddressBlueprint < Blueprinter::Base
  identifier :id

  fields :street_address, :locality, :region, :postal_code, :country, :address_type
end
