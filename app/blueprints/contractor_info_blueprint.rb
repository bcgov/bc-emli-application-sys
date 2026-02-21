class ContractorInfoBlueprint < Blueprinter::Base
  identifier :id

  fields(
    :doing_business_as,
    :license_issuer,
    :license_number,
    :incorporated_year,
    :number_of_employees,
    :gst_number,
    :worksafebc_number,
    :type_of_business,
    :primary_program_measure,
    :retrofit_enabling_measures,
    :service_languages,
    :updated_at
  )
end
