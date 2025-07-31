require "open3"
require "json"
require "fileutils"

class PdfGenerationJob
  include Sidekiq::Worker
  sidekiq_options lock: :until_and_while_executing,
                  queue: :file_processing,
                  on_conflict: {
                    client: :log,
                    server: :reject
                  }

  def self.lock_args(args)
    ## only lock on the first argument, which is the permit application id
    ## this will prevent multiple jobs from running for the same permit application
    [args[0]]
  end

  def perform(permit_application_id)
    permit_application = PermitApplication.find(permit_application_id)
    return if permit_application.blank?

    generation_directory_path = Rails.root.join("tmp/files")
    asset_directory_path = Rails.root.join("public")

    puts "=== Directory Creation Debug ==="
    puts "Target directory: #{generation_directory_path}"
    puts "Rails root: #{Rails.root}"
    puts "Directory exists before creation: #{File.directory?(generation_directory_path)}"
    puts "Parent directory (/app/tmp) exists: #{File.directory?(Rails.root.join("tmp"))}"
    puts "Parent directory permissions: #{File.directory?(Rails.root.join("tmp")) ? File.stat(Rails.root.join("tmp")).mode.to_s(8) : "N/A"}"

    # Ensure the directory exists and has correct permissions
    unless File.directory?(generation_directory_path)
      puts "Creating directory: #{generation_directory_path}"
      begin
        FileUtils.mkdir_p(generation_directory_path)
        puts "mkdir_p completed without error"
      rescue => e
        puts "ERROR during mkdir_p: #{e.class}: #{e.message}"
        raise e
      end
    end

    puts "Directory exists after creation attempt: #{File.directory?(generation_directory_path)}"

    # Ensure directory is writable
    if File.directory?(generation_directory_path)
      unless File.writable?(generation_directory_path)
        puts "Directory not writable, setting permissions"
        FileUtils.chmod(0755, generation_directory_path)
      end
      puts "Directory is writable: #{File.writable?(generation_directory_path)}"
      puts "Directory permissions: #{File.stat(generation_directory_path).mode.to_s(8)}"
    else
      puts "ERROR: Directory still does not exist after creation attempt!"
      raise "Failed to create directory: #{generation_directory_path}"
    end

    puts "Directory ensured: #{generation_directory_path}"
    puts "=== End Directory Debug ==="

    submission_version_with_missing_pdfs =
      permit_application.submission_versions.select(&:missing_pdfs?)

    submission_versions_data =
      submission_version_with_missing_pdfs.map do |submission_version|
        # Convert data to JSON string
        application_filename =
          "permit_application_#{permit_application.id}_v#{submission_version.version_number}.pdf"
        step_code_filename =
          "step_code_checklist_#{permit_application.id}_v#{submission_version.version_number}.pdf"

        should_permit_application_pdf_be_generated =
          submission_version.missing_permit_application_pdf?
        should_checklist_pdf_be_generated =
          submission_version.missing_step_code_checklist_pdf?

        permit_app_data =
          camelize_response(
            PermitApplicationBlueprint.render_as_json(
              permit_application,
              view: :pdf_generation,
              form_json: submission_version.form_json,
              submission_data: submission_version.formatted_submission_data,
              submitted_at: submission_version.created_at
            )
          )

        puts "=== PDF Data Generation Debug ==="
        puts "Permit application data keys: #{permit_app_data&.keys&.join(", ")}"
        puts "Permit application ID: #{permit_app_data&.dig("id")}"
        puts "Permit application number: #{permit_app_data&.dig("number")}"
        puts "Submitter data: #{permit_app_data&.dig("submitter")&.inspect}"
        puts "Has step code checklist: #{submission_version.has_step_code_checklist?}"
        puts "Should generate permit app PDF: #{should_permit_application_pdf_be_generated}"
        puts "Should generate checklist PDF: #{should_checklist_pdf_be_generated}"

        pdf_json_data = {
          permitApplication: permit_app_data,
          checklist:
            submission_version.has_step_code_checklist? &&
              camelize_response(submission_version.step_code_checklist_json),
          meta: {
            generationPaths: {
              permitApplication:
                should_permit_application_pdf_be_generated &&
                  generation_directory_path.join(application_filename).to_s,
              stepCodeChecklist:
                should_checklist_pdf_be_generated &&
                  generation_directory_path.join(step_code_filename).to_s
            },
            assetDirectoryPath: asset_directory_path.to_s
          }
        }.to_json

        puts "Meta generationPaths: #{JSON.parse(pdf_json_data)["meta"]["generationPaths"].inspect}"

        # Additional JSON data debugging
        parsed_json = JSON.parse(pdf_json_data)
        puts "JSON structure keys: #{parsed_json.keys.join(", ")}"
        puts "Permit application keys: #{parsed_json["permitApplication"]&.keys&.join(", ")}"
        puts "Form customizations present: #{parsed_json["permitApplication"]&.dig("formCustomizations").present?}"
        puts "Form customizations content: #{parsed_json["permitApplication"]&.dig("formCustomizations")&.inspect}"
        puts "Form JSON present: #{parsed_json["permitApplication"]&.dig("formJson").present?}"
        puts "Submission data present: #{parsed_json["permitApplication"]&.dig("submissionData").present?}"
        puts "=== End PDF Data Debug ==="

        {
          submission_version: submission_version,
          pdf_json_data: pdf_json_data,
          application_filename: application_filename,
          step_code_filename: step_code_filename,
          should_permit_application_pdf_be_generated:
            should_permit_application_pdf_be_generated,
          should_checklist_pdf_be_generated: should_checklist_pdf_be_generated
        }
      end

    submission_versions_data.each do |submission_version_data|
      generate_pdfs(submission_version_data, generation_directory_path)
    end
  end

  def generate_pdfs(submission_version_data, generation_directory_path)
    submission_version = submission_version_data[:submission_version]
    pdf_json_data = submission_version_data[:pdf_json_data]
    application_filename = submission_version_data[:application_filename]
    step_code_filename = submission_version_data[:step_code_filename]
    should_permit_application_pdf_be_generated =
      submission_version_data[:should_permit_application_pdf_be_generated]
    should_checklist_pdf_be_generated =
      submission_version_data[:should_checklist_pdf_be_generated]

    json_filename =
      "#{generation_directory_path}/pdf_json_data_#{submission_version.id}.json"

    File.open(json_filename, "w") { |file| file.write(pdf_json_data) }

    # Verify JSON file was written correctly
    puts "=== JSON File Verification ==="
    if File.exist?(json_filename)
      json_content = File.read(json_filename)
      puts "JSON file written successfully"
      puts "JSON file readable: #{!json_content.empty?}"

      begin
        parsed_verification = JSON.parse(json_content)
        puts "JSON is valid and parseable"
        puts "Parsed keys: #{parsed_verification.keys.join(", ")}"

        # Check critical data points
        permit_app = parsed_verification["permitApplication"]
        if permit_app
          puts "Permit application data present: ✓"
          puts "Permit app ID: #{permit_app["id"]}"
          puts "Form JSON present: #{permit_app["formJson"].present?}"
          puts "Submission data present: #{permit_app["submissionData"].present?}"
        else
          puts "ERROR: No permit application data in JSON!"
        end

        meta = parsed_verification["meta"]
        if meta && meta["generationPaths"]
          puts "Generation paths present: ✓"
          puts "Permit app path: #{meta["generationPaths"]["permitApplication"]}"
        else
          puts "ERROR: No generation paths in JSON!"
        end
      rescue JSON::ParserError => e
        puts "ERROR: JSON is not valid - #{e.message}"
      end
    else
      puts "ERROR: JSON file was not created!"
    end
    puts "=== End JSON Verification ==="

    puts "=== Node.js Execution Debug ==="
    puts "JSON filename: #{json_filename}"
    puts "JSON file exists: #{File.exist?(json_filename)}"
    puts "JSON file size: #{File.exist?(json_filename) ? File.size(json_filename) : "N/A"} bytes"
    puts "Working directory: #{Rails.root}"
    puts "Command: npm run #{NodeScripts::GENERATE_PDF_SCRIPT_NAME} #{json_filename}"
    puts "Expected output files:"
    puts "- Permit application PDF: #{should_permit_application_pdf_be_generated ? "#{generation_directory_path}/#{application_filename}" : "Not generating"}"
    puts "- Step code checklist PDF: #{should_checklist_pdf_be_generated ? "#{generation_directory_path}/#{step_code_filename}" : "Not generating"}"
    puts "JSON content preview (first 500 chars): #{pdf_json_data[0..500]}..."
    puts "Files in directory before execution: #{Dir.entries(generation_directory_path).join(", ")}"

    # Debug the exact paths that will be generated
    parsed_json = JSON.parse(pdf_json_data)
    generation_paths = parsed_json.dig("meta", "generationPaths")
    if generation_paths
      puts "=== Expected Output Paths ==="
      generation_paths.each do |key, path|
        next unless path
        puts "#{key}: #{path}"
        puts "  - Directory exists: #{File.directory?(File.dirname(path))}"
        puts "  - Directory writable: #{File.writable?(File.dirname(path))}"
        puts "  - Path absolute: #{File.absolute_path?(path)}"
      end
      puts "=== End Expected Paths ==="
    end

    # Check Node.js environment
    puts "=== Node.js Environment Check ==="
    node_version =
      begin
        `node --version 2>&1`.strip
      rescue StandardError
        "Not available"
      end
    npm_version =
      begin
        `npm --version 2>&1`.strip
      rescue StandardError
        "Not available"
      end
    puts "Node.js version: #{node_version}"
    puts "NPM version: #{npm_version}"
    puts "Package.json exists: #{File.exist?(Rails.root.join("package.json"))}"
    puts "SSR script exists: #{File.exist?(Rails.root.join("public/vite-ssr/ssr.js"))}"
    puts "=== End Environment Check ==="

    # Execute Node.js PDF generation
    puts "=== Executing Node.js PDF Generation ==="
    command =
      "npm run #{NodeScripts::GENERATE_PDF_SCRIPT_NAME} #{json_filename}"
    puts "Running command: #{command}"

    stdout, stderr, status = Open3.capture3(command, chdir: Rails.root)

    puts "=== Node.js Command Output ==="
    puts "Exit status: #{status.exitstatus}"
    puts "STDOUT: #{stdout}" unless stdout.blank?
    puts "STDERR: #{stderr}" unless stderr.blank?
    puts "=== End Node.js Output ==="

    unless status.success?
      puts "ERROR: Node.js PDF generation failed with exit code #{status.exitstatus}"
      puts "STDOUT: #{stdout}"
      puts "STDERR: #{stderr}"
      raise "Node.js PDF generation failed: #{stderr.blank? ? stdout : stderr}"
    end

    puts "Node.js PDF generation completed successfully"

    # Collect generated PDF files
    pdfs = []
    if should_permit_application_pdf_be_generated
      pdfs << {
        fname: application_filename,
        key: PermitApplication::PERMIT_APP_PDF_DATA_KEY
      }
    end

    if should_checklist_pdf_be_generated
      pdfs << {
        fname: step_code_filename,
        key: PermitApplication::CHECKLIST_PDF_DATA_KEY
      }
    end

    # Wait a moment for file system to sync (prevents timing issues)
    sleep(0.5)

    # Process the generated PDFs
    pdfs.each do |pdf|
      path = "#{generation_directory_path}/#{pdf[:fname]}"
      puts "Processing PDF: #{path}"
      puts "File exists: #{File.exist?(path)}"
      puts "File size: #{File.exist?(path) ? File.size(path) : "N/A"} bytes"

      # Check if file exists with retry for timing issues
      retries = 0
      max_retries = 3
      while !File.exist?(path) && retries < max_retries
        puts "PDF file not found, waiting and retrying... (attempt #{retries + 1}/#{max_retries})"
        sleep(1)
        retries += 1
      end

      unless File.exist?(path)
        raise "PDF file was not created by Node.js script: #{path}"
      end

      # Validate PDF file size
      file_size = File.size(path)
      if file_size < 1000 # PDFs should be at least 1KB
        raise "Generated PDF file is too small (#{file_size} bytes), likely corrupted: #{path}"
      end

      puts "PDF validated successfully: #{file_size} bytes"

      File.open(path) do |file|
        doc =
          submission_version
            .supporting_documents
            .where(
              permit_application_id: submission_version.permit_application_id,
              data_key: pdf[:key]
            )
            .first_or_initialize

        doc.update(file:) if doc.file.blank?
      end

      # Delete the temporary file after it's been saved
      File.delete(path) if File.exist?(path)
    end

    # Clean up JSON file after processing
    File.delete(json_filename) if File.exist?(json_filename)
  end

  # Ruby-based PDF generation methods
  def generate_ruby_permit_pdf(output_path, submission_version)
    permit_application = submission_version.permit_application

    content = []
    content << "BC ENERGY STEP CODE"
    content << "=" * 50
    content << "PERMIT APPLICATION"
    content << "=" * 50
    content << ""
    content << "Application ID: #{permit_application.number}"
    content << "Address: #{permit_application.full_address}"
    content << "Submission Date: #{submission_version.created_at&.strftime("%Y-%m-%d")}"
    content << "Applicant: #{applicant_name(permit_application)}"
    content << "Status: #{permit_application.status&.humanize}"
    content << ""
    content << "FORM DATA"
    content << "=" * 30

    # Add form data
    if submission_version.formatted_submission_data.present?
      flatten_form_data(
        submission_version.formatted_submission_data
      ).each do |key, value|
        next if value.blank?
        content << "#{key}: #{value}"
      end
    end

    content << ""
    content << "Generated on: #{Time.current.strftime("%Y-%m-%d %H:%M:%S")}"

    # Create basic PDF structure
    pdf_content = create_basic_pdf_structure(content.join("\n"))
    File.write(output_path, pdf_content)

    puts "Ruby permit PDF created: #{File.size(output_path)} bytes"
  end

  def generate_ruby_checklist_pdf(output_path, submission_version)
    permit_application = submission_version.permit_application

    content = []
    content << "BC ENERGY STEP CODE"
    content << "=" * 50
    content << "STEP CODE CHECKLIST"
    content << "=" * 50
    content << ""
    content << "Application ID: #{permit_application.number}"
    content << "Address: #{permit_application.full_address}"
    content << ""

    if submission_version.has_step_code_checklist?
      content << "CHECKLIST DATA"
      content << "=" * 30
      checklist_data = submission_version.step_code_checklist_json
      if checklist_data.present?
        flatten_form_data(checklist_data).each do |key, value|
          next if value.blank?
          content << "#{key}: #{value}"
        end
      end
    else
      content << "No step code checklist required for this application."
    end

    content << ""
    content << "Generated on: #{Time.current.strftime("%Y-%m-%d %H:%M:%S")}"

    # Create basic PDF structure
    pdf_content = create_basic_pdf_structure(content.join("\n"))
    File.write(output_path, pdf_content)

    puts "Ruby checklist PDF created: #{File.size(output_path)} bytes"
  end

  def create_basic_pdf_structure(text_content)
    # Create a minimal but valid PDF structure
    clean_text = text_content.gsub(/[^\x20-\x7E\n]/, "").strip

    pdf_header = "%PDF-1.4\n"

    catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"

    pages = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"

    page =
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"

    font =
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n"

    # Split text into lines and limit line length, escape parentheses
    lines =
      clean_text
        .split("\n")
        .map { |line| line[0..80].gsub(/[()\\]/, '\\\\\\&') }

    content_stream = "BT\n/F1 10 Tf\n72 720 Td\n"
    lines.each_with_index do |line, index|
      content_stream += "0 -12 Td\n" if index > 0
      content_stream += "(#{line}) Tj\n"
    end
    content_stream += "ET"

    content_length = content_stream.length
    content_obj =
      "5 0 obj\n<< /Length #{content_length} >>\nstream\n#{content_stream}\nendstream\nendobj\n"

    # Calculate correct offsets for xref table
    objects = [pdf_header, catalog, pages, page, font, content_obj]
    offsets = []
    current_pos = 0

    objects.each_with_index do |obj, i|
      if i == 0
        offsets << 0 # Header doesn't count
      else
        offsets << current_pos
      end
      current_pos += obj.length
    end

    xref_position = current_pos

    xref = "xref\n0 6\n0000000000 65535 f \n"
    (1..5).each { |i| xref += sprintf("%010d 00000 n \n", offsets[i]) }

    trailer =
      "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n#{xref_position}\n%%EOF"

    objects.join("") + xref + trailer
  end

  def applicant_name(permit_application)
    submitter = permit_application.submitter
    if submitter
      "#{submitter.first_name} #{submitter.last_name}".strip
    else
      "Unknown"
    end
  end

  def flatten_form_data(data, prefix = "")
    result = {}
    return result unless data.is_a?(Hash)

    data.each do |key, value|
      next if key == "section-completion-key"

      full_key = prefix.empty? ? key.humanize : "#{prefix} > #{key.humanize}"

      case value
      when Hash
        result.merge!(flatten_form_data(value, full_key))
      when Array
        result[full_key] = value.join(", ") unless value.empty?
      else
        result[full_key] = value unless value.blank?
      end
    end

    result
  end

  private

  def camelize_response(data)
    return nil if data.blank?
    return data unless data.respond_to?(:each_pair)

    camelized = {}
    data.each_pair do |key, value|
      camel_key = key.to_s.camelize(:lower)
      camelized[camel_key] = case value
      when Hash
        camelize_response(value)
      when Array
        value.map { |v| v.is_a?(Hash) ? camelize_response(v) : v }
      else
        value
      end
    end
    camelized
  end
end
