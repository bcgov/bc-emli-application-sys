class SubmissionDataExtractorService
  attr_accessor :permit_application

  def initialize(permit_application)
    self.permit_application = permit_application
  end

  # Returns a hash with all summary fields extracted from submission_data
  def extract_summary_fields
    {
      address: extract_address,
      primary_heating_system: extract_heating_system(:primary),
      secondary_heating_system: extract_heating_system(:secondary),
      first_name: extract_first_name,
      last_name: extract_last_name,
      phone_number: extract_phone,
      email: extract_email
    }
  end

  private

  def latest_submission_data
    return nil unless permit_application.submission_versions.any?
    permit_application.submission_versions.last.submission_data&.dig("data")
  end

  def extract_address
    data = latest_submission_data
    return nil unless data

    unit_number = find_field_by_suffix(data, "unit_number")
    street_address = find_field_by_suffix(data, "street_address")
    city_town = find_field_by_suffix(data, "city_town")
    postal_code = find_field_by_suffix(data, "postal_code")

    address_parts = []
    if unit_number.present?
      address_parts << "#{unit_number} #{street_address}".strip
    elsif street_address.present?
      address_parts << street_address
    end

    if city_town.present? || postal_code.present?
      address_parts << [city_town, postal_code].compact.join(" ")
    end

    result = address_parts.join(", ")
    result.present? ? result : nil
  end

  def extract_heating_system(type)
    data = latest_submission_data
    return nil unless data

    suffix =
      case type
      when :primary
        "how_do_you_heat_your_home"
      when :secondary
        "do_you_have_a_back-up_or_secondary_heating_system"
      else
        return nil
      end

    find_field_by_suffix(data, suffix)
  end

  def extract_first_name
    data = latest_submission_data
    return nil unless data
    find_field_by_suffix(data, "first_name")
  end

  def extract_last_name
    data = latest_submission_data
    return nil unless data
    find_field_by_suffix(data, "last_name")
  end

  def extract_phone
    data = latest_submission_data
    return nil unless data
    find_field_by_suffix(data, "phone_number")
  end

  def extract_email
    data = latest_submission_data
    return nil unless data
    find_field_by_suffix(data, "email")
  end

  def find_field_by_suffix(submission_data, suffix)
    return nil unless submission_data.is_a?(Hash)
    submission_data.each do |_section_key, section_value|
      next unless section_value.is_a?(Hash)
      section_value.each do |field_key, field_value|
        return field_value if field_key.end_with?("|#{suffix}")
      end
    end
    nil
  end
end
