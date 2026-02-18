# app/services/permit_application/contractor_onboarding_processor.rb
class PermitApplication::ContractorOnboardingProcessor
  # tnit the processor with an application
  # this object has the submission_data JSON to be parsed and mapped
  def initialize(application)
    @application = application
    # Parse submission_data into a Hash for traversal.
    raw_data = application.submission_data
    @data = raw_data.is_a?(String) ? JSON.parse(raw_data) : raw_data || {}
  end

  # main entry point for processing.
  def process!
    # Extract grouped data for the various target models.
    contractor_detail_attrs = extract_contractor_details
    employee_attrs = extract_employees
    contractor_info_attrs = extract_contractor_info

    Rails.logger.debug("Extracted contractor info: #{contractor_info_attrs}")
    # The contractor record should already exist (created earlier in the onboarding flow).
    # use the submitter_id to fetch the right record.
    contractor = Contractor.find(@application.submitter_id)
    contractor.update!(contractor_detail_attrs)

    # contractor_info contains the detailed business information, licenses, etc.
    # contractor handles the upsert for the _info
    contractor.upsert_contractor_info(contractor_info_attrs)

    # terate over the parsed employee attributes array and create invitations
    # Skip if there are no employees in the parsed form
    if employee_attrs.present?
      # we need to find the primary contact as the inviter for employees
      primary_user = User.find(contractor.contact_id)

      # re-use existing invitation service
      inviter =
        ContractorEmployeeInviter.new(
          contractor: contractor,
          program: @application.program,
          invited_by: primary_user
        )

      inviter.invite_employees(sanitize_employees(employee_attrs))
    end

    # fire the approval notification to the primary contact
    NotificationService.contractor_onboarding_approved_event(contractor)
  end

  # Syncs updated submission_data back to the contractor record (used after Save Edits on approved contractors)
  def sync_to_contractor(contractor)
    contractor.update!(extract_contractor_details)
    contractor.upsert_contractor_info(extract_contractor_info)
  end

  private

  def sanitize_employees(employees)
    employees.compact_blank.select do |e|
      e[:email].present? && e[:name].present?
    end
  end

  # extracts top-level contractor details (basic contact and address info).
  def extract_contractor_details
    {
      business_name: find_value_by_key_end("business_name"),
      email: find_value_by_key_end("business_email"),
      phone_number: find_value_by_key_end("business_phone"),
      cellphone_number: find_value_by_key_end("business_mobile_phone"),
      street_address: find_value_by_key_end("street_address"),
      city: find_value_by_key_end("city"),
      postal_code: find_value_by_key_end("postal_code")
    }
  end

  # extract the more detailed company information (licensing, GST, etc.)
  def extract_contractor_info
    {
      doing_business_as:
        find_value_by_key_end(
          "doing_business_as_if_different_from_business_name"
        ),
      license_issuer: find_value_by_key_end("business_licence_issuer"),
      license_number: find_value_by_key_end("business_licence_number"),
      incorporated_year:
        find_value_by_key_end(
          "year_the_business_was_incorporated_if_applicable"
        ),
      number_of_employees:
        find_value_by_key_end("approximate_number_of_employees"),
      gst_number: find_value_by_key_end("gst_number"),
      worksafebc_number: find_value_by_key_end("worksafebc_number"),
      type_of_business: extract_selected_checkbox_values("type_of_business"),
      primary_program_measure:
        extract_selected_checkbox_values("primary_program_measures"),
      retrofit_enabling_measures:
        extract_selected_checkbox_values("retrofit_enabling_measures"),
      service_languages:
        extract_selected_checkbox_values(
          "what_language_s_does_your_business_provide_services_in"
        )
    }
  end

  # extracts all employee records from the "employee_details" array within the submission data.
  def extract_employees
    employees_section =
      @data
        .dig("data")
        &.values
        &.find do |section|
          section.is_a?(Hash) &&
            section.keys.any? { |k| k.include?("employee_details") }
        end
    return [] unless employees_section

    # Flatten the nested array of employee hashes and pull out the desired fields.
    employees_section
      .values
      .flatten
      .each_with_object([]) do |row, acc|
        next unless row.is_a?(Hash)

        name = row.find { |k, _| k.end_with?("employeeName") }&.last
        email = row.find { |k, _| k.end_with?("employeeEmail") }&.last

        next if name.blank? || email.blank?

        acc << { name:, email: }
      end
  end

  # utility method to extract the value of a selected checkbox from the submission data.
  # it looks for keys that end with the specified key_end string and checks if their value
  # is true, returning the first matching key (which represents the selected option).
  def extract_selected_checkbox_values(key_end)
    hash = find_value_by_key_end(key_end)
    return [] unless hash.is_a?(Hash)

    hash.select { |_k, v| v == true }.keys
  end

  # utility method that scans through all sections and returns the value of
  # the first key that ends with the specified string (key_end).
  # supports dynamic section UUIDs and key prefixes.
  def find_value_by_key_end(key_end)
    found_value = nil

    @data["data"].each_value do |section|
      next unless section.is_a?(Hash)

      section.each do |key, value|
        if key.end_with?("|#{key_end}")
          found_value = value if value.present?
        end
      end
    end

    found_value
  end
end
