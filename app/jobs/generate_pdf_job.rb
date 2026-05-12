require "open3"
require "json"
require "fileutils"

class GeneratePdfJob
  include Sidekiq::Worker
  sidekiq_options lock: :until_and_while_executing,
                  queue: :file_processing,
                  on_conflict: {
                    client: :log,
                    server: :reject
                  }

  def self.lock_args(args)
    [args[0]]
  end

  def perform(permit_application_id)
    begin
      permit_application = PermitApplication.find(permit_application_id)
    rescue ActiveRecord::RecordNotFound
      return
    end

    generation_directory_path = Rails.root.join("tmp/files")
    asset_directory_path = Rails.root.join("public")

    unless File.directory?(generation_directory_path)
      begin
        FileUtils.mkdir_p(generation_directory_path)
      rescue => e
        Rails.logger.error "GeneratePdfJob: failed to create tmp/files directory: #{e.message}"
        raise e
      end
    end

    unless File.writable?(generation_directory_path)
      FileUtils.chmod(0755, generation_directory_path)
    end

    unless File.directory?(generation_directory_path)
      raise "Failed to create directory: #{generation_directory_path}"
    end

    submission_versions_with_missing_pdfs =
      permit_application.submission_versions.select(&:missing_pdfs?)

    submission_versions_data =
      submission_versions_with_missing_pdfs.map do |submission_version|
        application_filename =
          "permit_application_#{permit_application.id}_v#{submission_version.version_number}.pdf"

        should_permit_application_pdf_be_generated =
          submission_version.missing_permit_application_pdf?

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

        pdf_json_data = {
          permitApplication: permit_app_data,
          meta: {
            generationPaths: {
              permitApplication:
                should_permit_application_pdf_be_generated &&
                  generation_directory_path.join(application_filename).to_s
            },
            assetDirectoryPath: asset_directory_path.to_s
          }
        }.to_json

        {
          submission_version: submission_version,
          pdf_json_data: pdf_json_data,
          application_filename: application_filename,
          should_permit_application_pdf_be_generated:
            should_permit_application_pdf_be_generated
        }
      end

    pdfs_generated =
      submission_versions_data
        .map do |submission_version_data|
          generate_pdfs(submission_version_data, generation_directory_path)
        end
        .any?

    broadcast_update(permit_application) if pdfs_generated
  end

  def generate_pdfs(submission_version_data, generation_directory_path)
    submission_version = submission_version_data[:submission_version]
    pdf_json_data = submission_version_data[:pdf_json_data]
    application_filename = submission_version_data[:application_filename]
    should_permit_application_pdf_be_generated =
      submission_version_data[:should_permit_application_pdf_be_generated]

    json_filename = nil
    return false unless should_permit_application_pdf_be_generated

    json_filename =
      "#{generation_directory_path}/pdf_json_data_#{submission_version.id}.json"

    File.open(
      json_filename,
      File::WRONLY | File::CREAT | File::TRUNC,
      0o600
    ) { |file| file.write(pdf_json_data) }

    command_args = [
      "npm",
      "run",
      NodeScripts::GENERATE_PDF_SCRIPT_NAME,
      json_filename
    ]

    Rails.logger.info "=== Executing Node.js PDF Generation ==="
    start_time = Time.current
    stdout_str = ""
    stderr_str = ""
    status = nil
    timed_out = false

    Open3.popen3(
      *command_args,
      chdir: Rails.root,
      pgroup: true
    ) do |_stdin, stdout, stderr, wait_thr|
      pgid =
        begin
          Process.getpgid(wait_thr.pid)
        rescue Errno::ESRCH
          nil
        end

      out_reader = Thread.new { stdout.read }
      err_reader = Thread.new { stderr.read }

      deadline = Time.now + 30

      loop do
        if Time.now > deadline
          timed_out = true
          if pgid
            begin
              Process.kill("TERM", -pgid)
            rescue Errno::ESRCH
              nil
            end
            sleep 2
            begin
              Process.kill("KILL", -pgid)
            rescue Errno::ESRCH
              nil
            end
          end
          # Close pipes so reader threads unblock even if descendants escaped the pgroup
          begin
            stdout.close_read
          rescue StandardError
            nil
          end
          begin
            stderr.close_read
          rescue StandardError
            nil
          end
          break
        end
        break if wait_thr.join(1)
      end

      stdout_str = out_reader.join(3)&.value || ""
      stderr_str = err_reader.join(3)&.value || ""
      status = wait_thr.join(5)&.value
    end

    execution_time = Time.current - start_time
    Rails.logger.info "=== Node.js PDF Generation complete: exit=#{status&.exitstatus} time=#{execution_time.round(2)}s ==="

    if timed_out
      Rails.logger.error "GeneratePdfJob: Node.js timed out after #{execution_time.round(2)}s"
      Rails.logger.error "STDOUT: #{stdout_str}" if stdout_str.present?
      raise "Node.js PDF generation timed out after 30 seconds"
    end

    if stderr_str.present? && status.success?
      Rails.logger.warn "GeneratePdfJob: #{stderr_str}"
    end

    unless status.success?
      Rails.logger.error "GeneratePdfJob: Node.js failed (exit #{status.exitstatus}) in #{execution_time.round(2)}s"
      Rails.logger.error "STDOUT: #{stdout_str}" if stdout_str.present?
      Rails.logger.error "STDERR: #{stderr_str}" if stderr_str.present?
      raise "Node.js PDF generation failed: #{stderr_str.blank? ? stdout_str : stderr_str}"
    end

    pdfs = []
    if should_permit_application_pdf_be_generated
      pdfs << {
        fname: application_filename,
        key: PermitApplication::PERMIT_APP_PDF_DATA_KEY
      }
    end

    pdfs.each do |pdf|
      path = "#{generation_directory_path}/#{pdf[:fname]}"

      begin
        retries = 0
        while !File.exist?(path) && retries < 3
          sleep(1)
          retries += 1
        end

        unless File.exist?(path)
          Rails.logger.warn "GeneratePdfJob: Node.js exited 0 but #{pdf[:fname]} not found — using Ruby fallback"
          generate_ruby_permit_pdf(path, submission_version)
          unless File.exist?(path)
            raise "Both Node.js and Ruby fallback PDF generation failed: #{path}"
          end
          Rails.logger.info "GeneratePdfJob: Ruby fallback succeeded for #{pdf[:fname]}"
        end

        file_size = File.size(path)
        if file_size < 1000
          Rails.logger.warn "GeneratePdfJob: #{pdf[:fname]} suspiciously small (#{file_size} bytes) — using Ruby fallback"
          File.delete(path)
          generate_ruby_permit_pdf(path, submission_version)
          unless File.exist?(path)
            raise "PDF generation failed — both Node.js and Ruby methods produced invalid files: #{path}"
          end
          Rails.logger.info "GeneratePdfJob: Ruby fallback succeeded after small file for #{pdf[:fname]}"
        end

        File.open(path) do |file|
          doc =
            submission_version
              .supporting_documents
              .where(
                permit_application_id: submission_version.permit_application_id,
                data_key: pdf[:key]
              )
              .first_or_initialize

          if doc.file.blank?
            unless doc.update(file:)
              raise "GeneratePdfJob: failed to attach PDF #{pdf[:fname]}: #{doc.errors.full_messages.join(", ")}"
            end
          end
        end
      ensure
        File.delete(path) if File.exist?(path)
      end
    end

    true
  ensure
    File.delete(json_filename) if json_filename && File.exist?(json_filename)
  end

  private

  def generate_ruby_permit_pdf(output_path, submission_version)
    permit_application = submission_version.permit_application

    content = []
    content << "BC ENERGY STEP CODE"
    content << "=" * 50
    content << "PERMIT APPLICATION"
    content << "=" * 50
    content << ""
    content << "Reference #: #{permit_application.number}"
    content << "Address: #{permit_application.full_address}"
    content << "Submission Date: #{submission_version.created_at&.strftime("%Y-%m-%d")}"
    content << "Applicant: #{applicant_name(permit_application)}"
    content << "Status: #{permit_application.status&.humanize}"
    content << ""
    content << "FORM DATA"
    content << "=" * 30

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

    File.write(output_path, create_basic_pdf_structure(content.join("\n")))
  end

  def create_basic_pdf_structure(text_content)
    clean_text = text_content.gsub(/[^\x20-\x7E\n]/, "").strip

    pdf_header = "%PDF-1.4\n"
    catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    pages = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    page =
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    font =
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n"

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

    objects = [pdf_header, catalog, pages, page, font, content_obj]
    offsets = []
    current_pos = 0
    objects.each_with_index do |obj, i|
      offsets << (i == 0 ? 0 : current_pos)
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

  def broadcast_update(permit_application)
    blueprint_data =
      PermitApplicationBlueprint
        .render_as_hash(
          permit_application.reload,
          { view: :supporting_docs_update }
        )
        .deep_transform_keys { |key| key.to_s.camelize(:lower) }

    viewable_user_ids =
      (
        permit_application.notifiable_users.pluck(:id) +
          User.where(role: %i[admin admin_manager system_admin]).pluck(:id)
      ).uniq

    WebsocketBroadcaster.push_update_to_relevant_users(
      viewable_user_ids,
      Constants::Websockets::Events::PermitApplication::DOMAIN,
      Constants::Websockets::Events::PermitApplication::TYPES[
        :update_supporting_documents
      ],
      blueprint_data
    )
  end

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
