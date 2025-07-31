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

    # Run Node.js script as a child process, passing JSON data as an argument
    stdout, stderr, status =
      Open3.popen3(
        "npm",
        "run",
        NodeScripts::GENERATE_PDF_SCRIPT_NAME,
        json_filename,
        chdir: Rails.root.to_s
      ) do |stdin, stdout, stderr, wait_thr|
        # Read and print the standard output continuously until the process exits
        stdout_content = ""
        stderr_content = ""

        stdout.each_line do |line|
          puts "STDOUT: #{line}"
          stdout_content += line
        end

        stderr.each_line do |line|
          puts "STDERR: #{line}"
          stderr_content += line
        end

        # Wait for the process to exit and get the exit status
        exit_status = wait_thr.value

        puts "=== Node.js Process Results ==="
        puts "Node.js process exit status: #{exit_status.exitstatus}"
        puts "Node.js process success: #{exit_status.success?}"
        puts "Process PID: #{exit_status.pid}"
        puts "STDOUT length: #{stdout_content.length}"
        puts "STDERR length: #{stderr_content.length}"

        # Check directory immediately after process completes
        immediate_files =
          begin
            Dir.entries(generation_directory_path)
          rescue StandardError
            ["ERROR_READING_DIR"]
          end
        puts "Files immediately after Node.js execution: #{immediate_files.join(", ")}"

        # Look for any new files that weren't there before
        puts "Checking for any PDF files created..."
        pdf_files_after = immediate_files.select { |f| f.end_with?(".pdf") }
        puts "PDF files after execution: #{pdf_files_after.join(", ")}"
        puts "=== End Process Results ==="

        File.delete(json_filename)

        # Check for errors or handle output based on the exit status
        if exit_status.success?
          puts "=== File Verification After Node.js ==="
          puts "Node.js script completed successfully, now checking for generated files..."

          # Enhanced directory debugging
          puts "Generation directory: #{generation_directory_path}"
          puts "Directory exists: #{File.directory?(generation_directory_path)}"
          puts "Directory readable: #{File.readable?(generation_directory_path)}"
          puts "Directory writable: #{File.writable?(generation_directory_path)}"

          all_files =
            begin
              Dir.entries(generation_directory_path)
            rescue StandardError
              ["ERROR_READING_DIR"]
            end
          puts "All files in directory: #{all_files.join(", ")}"

          # Check for any PDF files
          pdf_files = all_files.select { |f| f.end_with?(".pdf") }
          puts "PDF files found: #{pdf_files.join(", ")}"

          # Check for any files with our application ID
          app_id_files =
            all_files.select do |f|
              f.include?(submission_version.permit_application_id)
            end
          puts "Files containing application ID: #{app_id_files.join(", ")}"

          pdfs = []
          if should_permit_application_pdf_be_generated
            permit_pdf_path =
              "#{generation_directory_path}/#{application_filename}"
            puts "=== Permit Application PDF Check ==="
            puts "Expected path: #{permit_pdf_path}"
            puts "Expected filename: #{application_filename}"
            puts "File exists: #{File.exist?(permit_pdf_path)}"

            if File.exist?(permit_pdf_path)
              file_stat = File.stat(permit_pdf_path)
              puts "File size: #{file_stat.size} bytes"
              puts "File modified: #{file_stat.mtime}"
              puts "File permissions: #{file_stat.mode.to_s(8)}"
            else
              puts "File does NOT exist at expected path"
              # Check for similar files
              similar_files =
                all_files.select { |f| f.include?("permit_application") }
              puts "Similar permit application files: #{similar_files.join(", ")}"
            end

            pdfs << {
              fname: application_filename,
              key: PermitApplication::PERMIT_APP_PDF_DATA_KEY
            }
          end

          if should_checklist_pdf_be_generated
            checklist_pdf_path =
              "#{generation_directory_path}/#{step_code_filename}"
            puts "=== Step Code Checklist PDF Check ==="
            puts "Expected path: #{checklist_pdf_path}"
            puts "Expected filename: #{step_code_filename}"
            puts "File exists: #{File.exist?(checklist_pdf_path)}"

            if File.exist?(checklist_pdf_path)
              file_stat = File.stat(checklist_pdf_path)
              puts "File size: #{file_stat.size} bytes"
              puts "File modified: #{file_stat.mtime}"
              puts "File permissions: #{file_stat.mode.to_s(8)}"
            else
              puts "File does NOT exist at expected path"
              # Check for similar files
              similar_files =
                all_files.select do |f|
                  f.include?("step_code") || f.include?("checklist")
                end
              puts "Similar checklist files: #{similar_files.join(", ")}"
            end

            pdfs << {
              fname: step_code_filename,
              key: PermitApplication::CHECKLIST_PDF_DATA_KEY
            }
          end

          puts "=== Final Directory State ==="
          final_files =
            begin
              Dir.entries(generation_directory_path)
            rescue StandardError
              ["ERROR_READING_DIR"]
            end
          puts "Final files in directory: #{final_files.join(", ")}"
          puts "=== End File Verification ==="

          pdfs.each do |pdf|
            path = "#{generation_directory_path}/#{pdf[:fname]}"
            puts "=== Processing PDF: #{pdf[:fname]} ==="
            puts "Full path: #{path}"
            puts "File exists: #{File.exist?(path)}"

            if File.exist?(path)
              puts "File size: #{File.size(path)} bytes"
            else
              puts "ERROR: File does not exist!"
              puts "Directory contents at failure:"
              failure_files =
                begin
                  Dir.entries(generation_directory_path)
                rescue StandardError
                  ["ERROR_READING_DIR"]
                end
              puts failure_files.join(", ")
            end

            unless File.exist?(path)
              raise "PDF file was not created by Node.js script: #{path}"
            end

            file = File.open(path)
            doc =
              submission_version
                .supporting_documents
                .where(
                  permit_application_id:
                    submission_version.permit_application_id,
                  data_key: pdf[:key]
                )
                .first_or_initialize

            doc.update(file:) if doc.file.blank?

            File.delete(path)
          end
        else
          puts "=== Node.js Process Failed ==="
          puts "Exit status: #{exit_status.exitstatus}"
          puts "Exit status success: #{exit_status.success?}"
          puts "Signal: #{exit_status.termsig}"
          puts "STDOUT content: #{stdout_content}"
          puts "STDERR content: #{stderr_content}"
          puts "Files in directory after failed execution: #{Dir.entries(generation_directory_path).join(", ")}"
          puts "=== End Failed Process Debug ==="

          err =
            "Pdf generation process failed: #{exit_status} - Exit code: #{exit_status.exitstatus}"
          Rails.logger.error err

          # this will raise an error and retry the job
          raise err
        end
      end
  end

  SUBMISSION_DATA_PREFIX = "formSubmissionData"
  FORMIO_SECTION_REGEX =
    /^section[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  SECTION_COMPLETION = "section-completion-key"

  def camelize_response(data)
    camelize_hash(data)
  end

  def camelize_hash(obj)
    case obj
    when Hash
      obj.each_with_object({}) do |(k, v), result|
        camelized_key = camelize_key(k)
        result[camelized_key] = camelize_hash(v)
      end
    when Array
      obj.map { |v| camelize_hash(v) }
    else
      obj
    end
  end

  def camelize_key(key)
    if key == SECTION_COMPLETION || key.start_with?(SUBMISSION_DATA_PREFIX)
      return key
    end

    return key if key.match?(FORMIO_SECTION_REGEX)

    key
      .split("_")
      .map
      .with_index { |word, index| index.zero? ? word : word.capitalize }
      .join
  end
end
