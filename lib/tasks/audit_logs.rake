require "fileutils"
require "json"
require "zlib"

namespace :audit_logs do
  desc "Archive old audit logs to S3 (gzipped text) and prune archived rows"
  task archive_and_prune: :environment do
    retention_days = Integer(ENV.fetch("AUDIT_LOG_RETENTION_DAYS", "90"), exception: false)
    batch_size = Integer(ENV.fetch("AUDIT_LOG_ARCHIVE_BATCH_SIZE", "1000"), exception: false)

    if retention_days.nil? || retention_days <= 0
      raise "AUDIT_LOG_RETENTION_DAYS must be a positive integer"
    end

    if batch_size.nil? || batch_size <= 0
      raise "AUDIT_LOG_ARCHIVE_BATCH_SIZE must be a positive integer"
    end

    cutoff = Time.current - retention_days.days
    scope = AuditLog.where("created_at < ?", cutoff)
    total = scope.count

    if total.zero?
      puts "No audit logs older than #{cutoff.utc.iso8601} to archive"
      next
    end

    # Require a dedicated bucket for audit-log archives so it stays isolated from app uploads/backups.
    bucket = ENV["AUDIT_LOG_ARCHIVE_S3_BUCKET"].presence
    raise "Missing AUDIT_LOG_ARCHIVE_S3_BUCKET" if bucket.blank?

    prefix = ENV.fetch("AUDIT_LOG_ARCHIVE_PREFIX", "audit-log-archives").gsub(%r{\A/+|/+$}, "")
    run_stamp = Time.current.utc.strftime("%Y%m%dT%H%M%SZ")
    file_stamp = cutoff.utc.strftime("%Y%m%dT%H%M%SZ")

    tmp_dir = Rails.root.join("tmp", "audit_log_archives")
    FileUtils.mkdir_p(tmp_dir)

    raw_path = tmp_dir.join("audit_logs_before_#{file_stamp}_#{run_stamp}.txt")
    gz_path = Pathname.new("#{raw_path}.gz")

    exported = 0
    File.open(raw_path, "w") do |file|
      scope.in_batches(of: batch_size) do |relation|
        relation.select(:id,
                        :table_name,
                        :action,
                        :data_before,
                        :data_after,
                        :created_at,
                        :updated_at,
                        :user_id).each do |log|
          file.puts(JSON.generate(log.attributes))
          exported += 1
        end
      end
    end

    Zlib::GzipWriter.open(gz_path.to_s) do |gzip|
      File.open(raw_path, "rb") { |raw| IO.copy_stream(raw, gzip) }
    end

    object_key_parts = [prefix, cutoff.utc.strftime("%Y/%m"), File.basename(gz_path.to_s)].reject(&:blank?)
    object_key = object_key_parts.join("/")

    puts "Exported #{exported} audit logs into #{gz_path}"

    s3_client =
      Aws::S3::Client.new(
        access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
        secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
        endpoint: ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"],
        force_path_style: true
      )

    File.open(gz_path, "rb") do |archive_io|
      s3_client.put_object(
        bucket: bucket,
        key: object_key,
        body: archive_io,
        content_type: "text/plain",
        content_encoding: "gzip"
      )
    end

    s3_client.head_object(bucket: bucket, key: object_key)
    puts "Uploaded archive to s3://#{bucket}/#{object_key}"

    deleted = 0
    AuditLog.where("created_at < ?", cutoff).in_batches(of: batch_size) do |relation|
      deleted += relation.delete_all
    end

    puts "Pruned #{deleted} archived audit logs"
  ensure
    FileUtils.rm_f(raw_path) if defined?(raw_path) && raw_path.present?
    FileUtils.rm_f(gz_path) if defined?(gz_path) && gz_path.present?
  end
end
