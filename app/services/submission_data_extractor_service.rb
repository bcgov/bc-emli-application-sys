require "set"

class SubmissionDataExtractorService
  attr_accessor :permit_application

  # Field suffixes collected from submission_data in a single traversal.
  # A field key looks like "<section>|<suffix>"; we match on the suffix.
  WANTED_SUFFIXES = %w[
    unit_number
    street_address
    installation_address
    city_town
    postal_code
    how_do_you_heat_your_home
    do_you_have_a_back-up_or_secondary_heating_system
    first_name
    last_name
    phone_number
    what_type_of_home_do_you_live_in
    total_cost
    customer_first_name
    customer_last_name
  ].to_set

  def initialize(permit_application)
    self.permit_application = permit_application
  end

  # Returns a hash with all summary fields extracted from submission_data.
  # The form blob is walked once (see #collected_fields) rather than once per
  # field, which keeps this lightweight endpoint cheap under continuous polling.
  def extract_summary_fields
    f = collected_fields
    {
      address: build_address(f["street_address"], f),
      primary_heating_system: f["how_do_you_heat_your_home"],
      secondary_heating_system:
        f["do_you_have_a_back-up_or_secondary_heating_system"],
      first_name: f["first_name"],
      last_name: f["last_name"],
      phone_number: f["phone_number"],
      email: f[:email],
      home_type: f["what_type_of_home_do_you_live_in"],
      # Invoice-specific fields (return nil for non-invoices)
      invoice_amount: f["total_cost"],
      homeowner_name: build_homeowner_name(f),
      installation_address: build_address(f["installation_address"], f)
    }
  end

  private

  def latest_submission_data
    @latest_submission_data ||= permit_application.submission_data&.dig("data")
  end

  # Walks each section/field exactly once, capturing the first value seen for
  # every wanted suffix (and the email field). First-match-wins preserves the
  # behaviour of the previous per-field find_field_by_suffix / _by_contains.
  def collected_fields
    @collected_fields ||=
      begin
        data = latest_submission_data
        found = {}

        if data.is_a?(Hash)
          data.each_value do |section|
            next unless section.is_a?(Hash)

            section.each do |field_key, field_value|
              _, sep, suffix = field_key.rpartition("|")
              if sep == "|" && !found.key?(suffix) &&
                   WANTED_SUFFIXES.include?(suffix)
                found[suffix] = field_value
              end

              # Email naming varies across templates: match any key containing
              # "email" whose value looks like an address.
              if !found.key?(:email) && field_key.downcase.include?("email") &&
                   field_value.is_a?(String) && field_value.include?("@")
                found[:email] = field_value
              end
            end
          end
        end

        found
      end
  end

  # Builds a "<unit> <line1>, <city> <postal>" address from collected parts.
  # line1 is the street_address (participant) or installation_address (invoice).
  def build_address(line1, fields)
    unit_number = fields["unit_number"]
    city_town = fields["city_town"]
    postal_code = fields["postal_code"]

    address_parts = []
    if unit_number.present?
      address_parts << "#{unit_number} #{line1}".strip
    elsif line1.present?
      address_parts << line1
    end

    if city_town.present? || postal_code.present?
      address_parts << [city_town, postal_code].compact.join(" ")
    end

    result = address_parts.join(", ")
    result.present? ? result : nil
  end

  def build_homeowner_name(fields)
    first = fields["customer_first_name"]
    last = fields["customer_last_name"]
    return nil unless first.present? || last.present?
    [first, last].compact.join(" ")
  end
end
