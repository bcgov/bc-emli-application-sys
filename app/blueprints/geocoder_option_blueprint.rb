class GeocoderOptionBlueprint < Blueprinter::Base
  fields :label, :value, :streetAddress, :localityName, :provinceCode, :score
end
