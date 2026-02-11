# app/services/contractor_imports/build_submission_json.rb
#
# This service is responsible for building the submission JSON for a contractor onboarding application
# based on the answers provided in the import data, and the mapping defined in DOMAIN_TO_REQUIREMENT_MAP
module ContractorImports
  class BuildSubmissionJson
    def initialize(answers_by_section:)
      @answers_by_section = answers_by_section
    end

    def call
      {
        "data" => build_data,
        "state" => "submitted",
        "_vnote" => "",
        "metadata" => default_metadata
      }
    end

    private

    attr_reader :answers_by_section

    def template
      # we need to find the right template to be able to traverse the sections and requirements and build the right keys for the submission JSON
      @template ||=
        RequirementTemplate.find_by!(
          program_id: program.id,
          user_group_type_id: user_group_type.id,
          audience_type_id: audience_type.id,
          submission_type_id: submission_type.id
        )
    end

    def program
      # we can hardcode this because the contractor onboarding application is only for one program
      # but ideally the program would be passed in or inferred from the application context
      @program ||= Program.find_by!(slug: "energy-savings-program")
    end

    def user_group_type
      @user_group_type ||= UserGroupType.find_by!(code: :contractor)
    end

    def audience_type
      @audience_type ||= AudienceType.find_by!(code: :external)
    end

    def submission_type
      @submission_type ||= SubmissionType.find_by!(code: :onboarding)
    end

    def build_data
      data = {
        "section-completion-key" => {
          "signed" => true,
          "submit" => true
        }
      }

      # iterate over the sections and build the nested structure of the submission JSON
      #   based on the requirement codes and the mapping defined in the OnboardingAnswerMapper
      sections.each do |section|
        data["section#{section.id}"] = build_section_payload(section)
      end

      data
    end

    def build_section_payload(section)
      payload = {}

      # iterate over the requirements for this section and build the key-value pairs
      #   for the submission JSON based on the mapping defined in the OnboardingAnswerMapper
      section_blocks(section).each do |section_block|
        block = RequirementBlock.find(section_block.requirement_block_id)
        requirements(block).each do |requirement|
          # find the mapping for this requirement based on the requirement code
          key = submission_key(section, block, requirement)
          # extract the value for this requirement from the answers_by_section hash, applying any necessary transformations based on the mapping configuration
          value = resolve_value(section, block, requirement)

          payload[key] = value
        end
      end

      payload
    end

    def resolve_value(section, block, requirement)
      # this method looks up the value for a given requirement based on the answers_by_section hash,
      # and applies any necessary transformations based on the mapping configuration defined in DOMAIN_TO_REQUIREMENT_MAP
      answers = answers_by_section[section.id]
      return nil unless answers&.key?(requirement.requirement_code)

      # first we get the raw value from the answers hash for this requirement
      raw_value = answers[requirement.requirement_code]

      return raw_value if raw_value.is_a?(Hash)

      # then we check if there is a mapping defined for this requirement to determine if we need to apply any transformations
      if requirement.input_options.present?
        option_value(requirement, raw_value)
      else
        raw_value
      end
    end

    # this method looks up the value of a requirement option based on the label
    # provided in the import data, and returns the corresponding value defined in the requirement's input options
    def option_value(requirement, label)
      requirement
        .input_options
        .fetch("value_options", [])
        .find { |opt| opt["label"] == label }
        &.dig("value")
    end

    def submission_key(section, block, requirement)
      "formSubmissionDataRSTsection#{section.id}|RB#{block.id}|#{requirement.requirement_code}"
    end

    def sections
      @sections ||=
        RequirementTemplateSection.where(requirement_template_id: template.id)
    end

    def section_blocks(section)
      TemplateSectionBlock.where(
        requirement_template_section_id: section.id
      ).includes(:requirement_block)
    end

    def requirements(block)
      @requirements_by_block ||= {}
      @requirements_by_block[block.id] ||= Requirement.where(
        requirement_block_id: block.id
      )
    end

    def default_metadata
      {}
    end

    def build_answers_by_section(template, domain_data)
      answers = {}

      # we need to iterate over the sections and requirements of the template to build the answers_by_section
      # hash in the correct structure and with the correct keys for the submission JSON
      sections =
        RequirementTemplateSection.where(requirement_template_id: template.id)

      # for each requirement, we look up the corresponding value in the domain_data based on the mapping
      # defined in DOMAIN_TO_REQUIREMENT_MAP, and apply any necessary transformations based on the mapping configuration
      sections.each do |section|
        section_answers = {}

        section_blocks =
          TemplateSectionBlock.where(
            requirement_template_section_id: section.id
          )

        # we iterate over the requirements for this section and build the key-value pairs
        # for the answers hash based on the mapping defined in DOMAIN_TO_REQUIREMENT_MAP
        section_blocks.each do |sb|
          requirements =
            Requirement.where(requirement_block_id: sb.requirement_block_id)

          # we iterate over the requirements for this section and build the key-value pairs
          requirements.each do |requirement|
            mapping =
              DOMAIN_TO_REQUIREMENT_MAP.values.find do
                [:requirement_code] == requirement.requirement_code
              end

            next unless mapping

            # if there is a mapping defined for this requirement, we look up the corresponding value
            # in the domain_data based on the domain key defined in the mapping configuration
            domain_key = DOMAIN_TO_REQUIREMENT_MAP.key(mapping)

            # we extract the raw value from the domain_data using the domain key
            raw_value = domain_data[domain_key]
            next if raw_value.nil?

            value =
              if mapping[:transform]
                mapping[:transform].call(raw_value, requirement)
              else
                raw_value
              end

            section_answers[requirement.requirement_code] = value
          end
        end

        # we only add the section answers to the answers hash if there are any answers for that section
        answers[section.id] = section_answers if section_answers.any?
      end

      answers
    end
  end
end
