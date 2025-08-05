require "shrine"
require "shrine/storage/file_system"
require "shrine/storage/s3"

# TODO: CDN Cache images?
# url_options = {
#   public: true,
#   host: ENV['CDN_HOST_URL']
# }

module Constants
  module Sizes
    FILE_UPLOAD_MAX_SIZE =
      (
        if ENV["VITE_FILE_UPLOAD_MAX_SIZE"].present?
          ENV["VITE_FILE_UPLOAD_MAX_SIZE"].to_d
        else
          100
        end
      )
    FILE_UPLOAD_ZIP_MAX_SIZE = FILE_UPLOAD_MAX_SIZE * 10
  end
end

SHRINE_USE_S3 =
  !(
    Rails.env.test? || ENV["IS_DOCKER_BUILD"].present? ||
      ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].blank?
  )

Rails.logger.info "Shrine S3 enabled: #{SHRINE_USE_S3}"
if SHRINE_USE_S3
  Rails.logger.info "Storage endpoint: #{ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]}"
end

if SHRINE_USE_S3
  # Dynamic credentials provider that fetches from database only
  def get_aws_credentials
    db_credentials = AwsCredential.current_s3_credentials if defined?(
      AwsCredential
    )

    if db_credentials && !Rails.env.test?
      Rails.logger.info "Using AWS credentials from database (expires: #{db_credentials[:expires_at]})"
      {
        access_key_id: db_credentials[:access_key_id],
        secret_access_key: db_credentials[:secret_access_key],
        session_token: db_credentials[:session_token]
      }
    elsif ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].present? &&
          ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"].present?
      Rails.logger.warn "No database credentials found, falling back to environment variables"
      Rails.logger.info "Run AwsCredentialRefreshService.new.refresh_credentials! to store credentials in database"
      {
        access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
        secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        session_token: nil
      }
    else
      Rails.logger.error "No valid AWS credentials found in database or environment! File uploads will fail."
      Rails.logger.error "Run AwsCredentialRefreshService.new.refresh_credentials! to initialize."
      # Return empty credentials that will cause S3 operations to fail gracefully
      { access_key_id: nil, secret_access_key: nil, session_token: nil }
    end
  end

  credentials = get_aws_credentials

  s3_options = {
    bucket: ENV["BCGOV_OBJECT_STORAGE_BUCKET"],
    endpoint: ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"],
    region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "no-region-needed",
    access_key_id: credentials[:access_key_id],
    secret_access_key: credentials[:secret_access_key],
    session_token: credentials[:session_token],
    force_path_style: true
  }.compact

  # Create bucket if using local MinIO (development)
  if Rails.env.development? &&
       ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]&.include?("minio")
    begin
      s3_client = Aws::S3::Client.new(s3_options.except(:bucket))
      bucket_name = s3_options[:bucket]

      unless s3_client.list_buckets.buckets.any? { |b| b.name == bucket_name }
        s3_client.create_bucket(bucket: bucket_name)
        Rails.logger.info "Created MinIO bucket: #{bucket_name}"

        # Set public read policy for uploads
        s3_client.put_bucket_policy(
          bucket: bucket_name,
          policy: {
            "Version" => "2012-10-17",
            "Statement" => [
              {
                "Effect" => "Allow",
                "Principal" => "*",
                "Action" => "s3:GetObject",
                "Resource" => "arn:aws:s3:::#{bucket_name}/*"
              }
            ]
          }.to_json
        )
        Rails.logger.info "Set public read policy for bucket: #{bucket_name}"
      end
    rescue => e
      Rails.logger.warn "Could not create/configure MinIO bucket: #{e.message}"
    end
  end

  # Create custom S3 storage class that can refresh credentials dynamically
  class DynamicS3Storage < Shrine::Storage::S3
    def initialize(**options)
      super(**options)
    end

    # Reset client to force credential refresh
    def refresh_client!
      @client = nil
      Rails.logger.info "S3 client refreshed"
    end

    private

    # Override the client method to provide fresh credentials from database only
    def client
      @client ||=
        begin
          # Get fresh credentials from database or environment
          if defined?(AwsCredential) && !Rails.env.test?
            db_credentials = AwsCredential.current_s3_credentials
            if db_credentials
              Rails.logger.debug "Refreshing S3 client with database credentials"
              Aws::S3::Client.new(
                endpoint: @options[:endpoint],
                region: @options[:region],
                access_key_id: db_credentials[:access_key_id],
                secret_access_key: db_credentials[:secret_access_key],
                session_token: db_credentials[:session_token],
                force_path_style: @options[:force_path_style]
              )
            elsif ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].present? &&
                  ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"].present?
              Rails.logger.debug "Refreshing S3 client with environment credentials"
              Aws::S3::Client.new(
                endpoint: @options[:endpoint],
                region: @options[:region],
                access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
                secret_access_key:
                  ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
                session_token: nil,
                force_path_style: @options[:force_path_style]
              )
            else
              Rails.logger.error "No database or environment credentials available! S3 operations will fail."
              raise "No valid AWS credentials found in database or environment. Run credential refresh job."
            end
          else
            super
          end
        end
    end
  end

  Shrine.storages = {
    cache: DynamicS3Storage.new(public: false, prefix: "cache", **s3_options),
    store: DynamicS3Storage.new(public: false, **s3_options)
  }
else
  Shrine.storages = {
    cache: Shrine::Storage::FileSystem.new("public", prefix: "uploads/cache"), # temporary
    store: Shrine::Storage::FileSystem.new("public", prefix: "uploads/store") # permanent
  }
end

Shrine.plugin :activerecord
Shrine.plugin :cached_attachment_data
Shrine.plugin :restore_cached_data
Shrine.plugin :rack_file
Shrine.plugin :backgrounding
Shrine.plugin :derivatives
Shrine.plugin :determine_mime_type
Shrine.plugin :add_metadata
# Shrine.plugin :url_options, cache: url_options, store: url_options
Shrine.plugin :form_assign
Shrine.plugin :data_uri
Shrine.plugin :remote_url,
              max_size: Constants::Sizes::FILE_UPLOAD_MAX_SIZE * 1024 * 1024 # https://shrinerb.com/docs/plugins/remote_url

Shrine.plugin :presign_endpoint,
              presign_options:
                lambda { |request|
                  filename = request.params["filename"]
                  type = request.params["type"]

                  {
                    method: :put,
                    content_disposition:
                      ContentDisposition.attachment(filename),
                    content_type: type
                    # content_md5: request.params["checksum"],
                    # transfer_encoding: "chunked",
                  }
                }
if SHRINE_USE_S3
  Shrine.plugin :uppy_s3_multipart,
                options: {
                  endpoint:
                    ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"] ||
                      ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]
                }
end

class Shrine::Storage::S3
  #https://github.com/transloadit/uppy/blob/960362b373666b18a6970f3778ee1440176975af/packages/%40uppy/companion/src/server/controllers/s3.js#L105
  #https://github.com/transloadit/uppy/blob/960362b373666b18a6970f3778ee1440176975af/packages/%40uppy/companion/src/server/controllers/s3.js#L240
  #https://github.com/janko/uppy-s3_multipart/blob/master/lib/uppy/s3_multipart/client.rb
  #uppy utilizes functionality to hit the endpoint to create a multi upload request and then allow you to batch sign urls for each part
  #we want to simulate something similar for form.io, but to simplify it we will use a presign put
  #one thing to watch out for is that presign_put uses shortly timed urls

  def presign_put(id, options)
    obj = object(id)

    #chunking handled by uppy
    # Use public endpoint for presigned URLs if available
    if ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"].present?
      # Create a temporary S3 client with public endpoint for presigned URLs
      public_client =
        Aws::S3::Client.new(
          endpoint: ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"],
          region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "no-region-needed",
          access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
          secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
          force_path_style: true
        )
      public_resource = Aws::S3::Resource.new(client: public_client)
      public_obj = public_resource.bucket(bucket.name).object(obj.key)
      signed_url = public_obj.presigned_url(:put, options)
    else
      signed_url = obj.presigned_url(:put, options)
    end

    url = signed_url
    # When any of these options are specified, the corresponding request
    # headers must be included in the upload request.
    headers = {}
    headers["Content-Length"] = options[:content_length] if options[
      :content_length
    ]
    headers["Content-Type"] = options[:content_type] if options[:content_type]
    headers["Content-Disposition"] = options[:content_disposition] if options[
      :content_disposition
    ]
    headers["Content-Encoding"] = options[:content_encoding] if options[
      :content_encoding
    ]
    headers["Content-Language"] = options[:content_language] if options[
      :content_language
    ]
    headers["Content-MD5"] = options[:content_md5] if options[:content_md5]

    {
      method: :put,
      url: url,
      signed_url: signed_url,
      headers: headers,
      key: obj.key
    }
  end

  # ECS S3 copy function does not take as many params, it works when its plain.  You can test in the code below to verify.
  # s3_client= Shrine.storages[:cache].client
  # s3_client.copy_object({
  #   copy_source: "#{ENV["BCGOV_OBJECT_STORAGE_BUCKET"]}/4ff7582a03d0aa90e13d179f1268381c.pdf",
  #   bucket: ENV["BCGOV_OBJECT_STORAGE_BUCKET"],
  #   key: "test.pdf"
  # })
  #itnercepted
  # {:copy_source=>"housing-bssb-ex-permithub-dev-bkt/4ff7582a03d0aa90e13d179f1268381c.pdf",
  #  :bucket=>"housing-bssb-ex-permithub-dev-bkt",
  #  :key=>"test.pdf"}

  def copy(io, id, **copy_options)
    # don't inherit source object metadata or AWS tags
    options = {
      # metadata_directive: "REPLACE",  #OVERRIDE COPY DO NOT ALLOW THESE DIRECTIVE OPTIONS
      # tagging_directive: "REPLACE"  #OVERRIDE COPY DO NOT ALLOW THESE DIRECTIVE OPTIONS
    }

    if io.size && io.size >= @multipart_threshold[:copy]
      # pass :content_length on multipart copy to avoid an additional HEAD request
      options.merge!(multipart_copy: true, content_length: io.size)
    end

    options.merge!(copy_options)
    object(id).copy_from(io.storage.object(io.id), **options)
  end
end
