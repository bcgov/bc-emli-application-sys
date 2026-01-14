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
    :service_languages
  )

  field :type_of_business do |info|
    info.type_of_business.map { |v| ContractorInfo::TYPE_OF_BUSINESS.key(v) }
  end

  field :primary_program_measure do |info|
    info.primary_program_measure.map do |v|
      ContractorInfo::PRIMARY_PROGRAM_MEASURE.key(v)
    end
  end

  field :retrofit_enabling_measures do |info|
    info.retrofit_enabling_measures&.map do |v|
      ContractorInfo::RETROFIT_ENABLING_MEASURES.key(v)
    end
  end
end
