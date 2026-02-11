# lib/tasks/import_contractors.rake
# This Rake task is designed to import contractor data from a JSON file into the system. 
# It reads the JSON file, processes each record, and creates ContractorImport records in the database. 
# The task includes normalization of certain fields (like business category and contact information) 
# to ensure consistency with the expected format in the system. 
# 
# It also provides a dry run option for testing the import without actually saving any records to the database. 
# The task outputs a summary of the import process, including counts of successfully imported records, skipped records 
# (due to duplicates), and failed records (due to validation errors or missing data).

# The CANONICAL_CATEGORIES constant defines the mapping of various raw category strings to a set of canonical category keys used in the system.
CANONICAL_CATEGORIES = {
  hvac: [
    "heating ventilation and air conditioning hvac"
  ],
  health_and_safety: [
    "health & safety",
    "health and safety"
  ],
  electrical: ["electrical"],
  insulation: ["insulation"],
  fenestration: ["fenestration"],
  asbestos_removal: ["asbestos removal"]
}.freeze

# This method takes a raw category string from the import data, normalizes it by downcasing, removing special characters, 
# and squeezing whitespace, and then checks if it matches any of the patterns defined in CANONICAL_CATEGORIES. If a match 
# is found, it returns the corresponding canonical category key. If no match is found, it returns nil.
def normalize_category(raw)
  return nil if raw.blank?

  normalized = raw
    .downcase
    .gsub("&", "and")
    .gsub(/[^a-z\s]/, "")
    .squeeze(" ")
    .strip

  CANONICAL_CATEGORIES.each do |key, patterns|
    return key if patterns.any? { |p| normalized.include?(p) }
  end

  nil
end

# this method normalizes the payload for each contractor record by applying specific transformations to certain fields, 
# such as normalizing the business category using the normalize_category method, and ensuring that the primary contact's 
# phone and mobile fields are populated appropriately (using one as a fallback for the other if one is missing).
def normalize_payload!(payload)
  # --- normalize business category ---
  raw_category = payload.dig("business", "category")
  payload["business"]["category"] = normalize_category(raw_category)

  # --- normalize phone / mobile fallback ---
  primary = payload.dig("contacts", "primary")
  return unless primary.is_a?(Hash)

  phone  = primary["phone"]
  mobile = primary["mobile"]

  primary["phone"]  ||= mobile
  primary["mobile"] ||= phone
end

namespace :contractors do
  desc "Import contractor payloads from JSON file"
  task import: :environment do
    require "json"
    
    # the file path can be specified via the FILE environment variable, and if not provided, it defaults to "scripts/contractors.json". 
    # The task checks if the file exists before proceeding, and aborts with an error message if the file is not found.
    dry_run = ENV["DRY_RUN"] == "1"
    file = ENV["FILE"] || "scripts/contractors.json"
    
    abort "File not found: #{file}" unless File.exist?(file)

    rows = JSON.parse(File.read(file))

    puts "Found #{rows.size} rows"
    success = 0
    skipped = 0
    failed  = 0

    # the task iterates over each record in the JSON file, extracts the invite code and payload, normalizes the payload, 
    # and performs minimal validation to ensure that the necessary business and contact information is present. 
    # If the record is valid and not a duplicate (based on the invite code), it creates a new ContractorImport record 
    # in the database (unless it's a dry run). The task keeps track of the number of successful imports, 
    # skipped records (due to duplicates), and failed records (due to validation errors), and outputs a summary at the end of the process.
    rows.each_with_index do |row, idx|
      invite_code = row.dig("metadata", "unique_code")

      if invite_code.blank?
        puts "Row #{idx + 1}: missing metadata.unique_code"
        failed += 1
        next
      end

      if ContractorImport.exists?(invite_code: invite_code)
        puts "#{invite_code}: already imported"
        skipped += 1
        next
      end

      payload = row.except("invite_code")

      normalize_payload!(payload)

      # minimal structural validation
      unless payload["business"].present? && payload["contacts"].present?
        puts "#{invite_code}: missing business info or contacts details"
        failed += 1
        next
      end

      if dry_run
        puts "Row #{idx + 1} (#{invite_code}): valid payload (dry run, not saving)"
      else
        ContractorImport.transaction do
          ContractorImport.create!(
            invite_code: invite_code,
            payload: payload
          )
        end
      end

      puts "Processed #{idx + 1}/#{rows.size}" if (idx + 1) % 50 == 0
      success += 1
    rescue => e
      puts "Row #{idx + 1} (#{invite_code || 'unknown'}): #{e.class} - #{e.message}"
      failed += 1
    end

    puts <<~SUMMARY

      Import complete:
        Successfully Imported: #{success}
        Records Skipped: #{skipped}
        Records Failed:  #{failed}

    SUMMARY
  end
end
