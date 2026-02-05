# lib/tasks/import_contractors.rake
namespace :contractors do
  desc "Import contractor payloads from JSON file"
  task import: :environment do
    require "json"

    file = ENV["FILE"] || "scripts/contractors.json"
    abort "File not found: #{file}" unless File.exist?(file)

    rows = JSON.parse(File.read(file))

    puts "Found #{rows.size} rows"
    success = 0
    skipped = 0
    failed  = 0

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

      # minimal structural validation
      unless payload["business"].present? && payload["contacts"].present?
        puts "#{invite_code}: missing business info or contacts details"
        failed += 1
        next
      end

      ContractorImport.create!(
        invite_code: invite_code,
        payload: payload
      )

      success += 1
    rescue => e
      puts "#{invite_code || 'unknown'}: #{e.class} - #{e.message}"
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
