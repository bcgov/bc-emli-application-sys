# app/services/contractor_imports/onboarding_answer_mapper.rb
#
# This service is responsible for mapping the raw import data for a contractor onboarding application
# to the structured answers_by_section format required for building the submission JSON, based on the mapping
# defined in DOMAIN_TO_REQUIREMENT_MAP
module ContractorImports
  class OnboardingAnswerMapper
    # this mapping defines how each domain key in the import data maps to a requirement code in the onboarding template,
    # as well as any transformations that need to be applied to the raw values from the import data to
    # match the expected format for the submission JSON. The transform lambdas take the raw value and the requirement object
    # (which can be used to access input options for checkbox fields) and returns the transformed value.
    DOMAIN_TO_REQUIREMENT_MAP = {
      business_category: {
        requirement_code: "type_of_business",
        checkbox: true,
        transform: ->(value, requirement) do
          selected = value.to_s.downcase

          requirement.input_options["value_options"].each_with_object(
            {}
          ) do |opt, acc|
            opt_value = opt["value"].to_s.downcase

            acc[opt["value"]] = opt_value.include?(selected) ||
              selected.include?(opt_value)
          end
        end
      },
      business_name: {
        requirement_code: "business_name"
      },
      business_email: {
        requirement_code: "business_email",
        transform: ->(value, _) { value.to_s.downcase }
      },
      business_phone: {
        requirement_code: "business_phone",
        transform: ->(value, _) { value.to_s }
      },
      business_mobile_phone: {
        requirement_code: "business_mobile_phone",
        transform: ->(value, _) { value.to_s }
      },
      street_address: {
        requirement_code: "street_address"
      },
      city: {
        requirement_code: "city"
      },
      postal_code: {
        requirement_code: "postal_code"
      },
      british_columbia: {
        requirement_code: "british_columbia",
        transform: ->(province, _) do
          province.to_s.strip.casecmp("British Columbia").zero?
        end
      },
      doing_business_as: {
        requirement_code: "doing_business_as_if_different_from_business_name"
      },
      business_license_issuer: {
        requirement_code: "business_licence_issuer"
      },
      business_license_number: {
        requirement_code: "business_licence_number",
        transform: ->(value, _) { value.to_s }
      },
      year_incorporated: {
        requirement_code: "year_the_business_was_incorporated_if_applicable",
        transform: ->(value, _) { value.to_s }
      },
      employee_count: {
        requirement_code: "approximate_number_of_employees",
        transform: ->(value, _) { value.to_s }
      },
      service_languages: {
        requirement_code:
          "what_language_s_does_your_business_provide_services_in",
        checkbox: true,
        transform: ->(values, requirement) do
          values = Array(values)

          options = requirement.input_options["value_options"]
          options.each_with_object({}) do |opt, acc|
            acc[opt["value"]] = values.include?(opt["label"])
          end
        end
      },
      program_measures: {
        requirement_code: "primary_program_measures",
        checkbox: true,
        transform: ->(values, requirement) do
          values = Array(values)

          options = requirement.input_options["value_options"]
          options.each_with_object({}) do |opt, acc|
            acc[opt["value"]] = values.include?(opt["label"])
          end
        end
      },
      retrofit_measures: {
        requirement_code: "retrofit_enabling_measures",
        checkbox: true,
        transform: ->(values, requirement) do
          values = Array(values)

          options = requirement.input_options["value_options"]
          options.each_with_object({}) do |opt, acc|
            acc[opt["value"]] = values.include?(opt["label"])
          end
        end
      }
    }.freeze

    def initialize(import_data:)
      @import_data = import_data
    end

    # the call method iterates over the sections and requirements of the onboarding template,
    # uses the DOMAIN_TO_REQUIREMENT_MAP to extract and transform the corresponding values from the import data,
    # and builds the answers_by_section hash in the structure required for the submission JSON.
    def call
      answers_by_section = {}

      sections.each do |section|
        section_answers = {}

        requirements_for(section).each do |requirement|
          # find the mapping for this requirement based on the requirement code
          mapping =
            DOMAIN_TO_REQUIREMENT_MAP.find do |_key, cfg|
              cfg[:requirement_code] == requirement.requirement_code
            end

          next unless mapping

          # extract the raw value from the import data based on the domain key
          domain_key, config = mapping
          raw_value = extract_domain_value(domain_key)

          # skip only if nil AND not a checkbox field, they default to false
          next if raw_value.nil? && !config[:checkbox]

          # apply transformation if defined
          value =
            if config[:transform]
              config[:transform].call(raw_value, requirement)
            else
              raw_value
            end

          section_answers[requirement.requirement_code] = value
        end

        answers_by_section[section.id] = section_answers
      end

      answers_by_section
    end

    private

    attr_reader :import_data

    # this method defines how to extract the raw value for each domain key
    # from the import data, based on the expected structure of the import data
    def extract_domain_value(key)
      case key
      when :business_category
        import_data.dig("business", "category")
      when :business_name
        import_data.dig("business", "name")
      when :business_email
        import_data.dig("username")
      when :business_phone
        import_data.dig("contacts", "primary", "phone")
      when :business_mobile_phone
        import_data.dig("contacts", "primary", "mobile")
      when :street_address
        import_data.dig("address", "street")
      when :city
        import_data.dig("address", "city")
      when :postal_code
        import_data.dig("address", "postal")
      when :british_columbia
        import_data.dig("address", "province")
      when :doing_business_as
        import_data.dig("business", "doing_business_as")
      when :business_license_issuer
        import_data.dig("business", "license", "issuer")
      when :business_license_number
        import_data.dig("business", "license", "number")
      when :year_incorporated
        import_data.dig("business", "year_incorporated")
      when :employee_count
        import_data.dig("operations", "employee_count")
      when :service_languages
        import_data.dig("operations", "languages")
      when :program_measures
        import_data.dig("operations", "program_measures")
      when :retrofit_measures
        import_data.dig("operations", "retrofit_measures")
      end
    end

    # the following methods define how to retrieve the sections and requirements for the
    # contractor onboarding template, which are needed to build the answers_by_section hash
    # in the correct structure for the submission JSON
    def sections
      RequirementTemplateSection.where(requirement_template_id: template.id)
    end

    # we retrieve the requirements for a given section by first finding the blocks for that
    # section, and then the requirements for each block
    def requirements_for(section)
      TemplateSectionBlock
        .where(requirement_template_section_id: section.id)
        .flat_map do |sb|
          Requirement.where(requirement_block_id: sb.requirement_block_id)
        end
    end

    # we memoize the template since we need to access it multiple times to retrieve the
    # sections and requirements, and building it is an expensive operation
    def template
      @template ||=
        BuildSubmissionJson.new(answers_by_section: {}).send(:template)
    end
  end
end
