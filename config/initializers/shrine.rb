require "shrine"
require "shrine/storage/file_system"
require "shrine/storage/s3"
require "digest"

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
  !(Rails.env.test? || ENV["IS_DOCKER_BUILD"].present?) &&
    ENV["BCGOV_OBJECT_STORAGE_BUCKET"].present?

Rails.logger.info "Shrine S3 enabled: #{SHRINE_USE_S3}"
if SHRINE_USE_S3
  Rails.logger.info "Storage endpoint: #{ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]}"
end

LOCAL_MINIO_S3 =
  Rails.env.development? &&
    (
      ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]&.include?("minio") ||
        ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]&.include?("localhost:9000")
    )

if SHRINE_USE_S3
  s3_options = {
    bucket: ENV["BCGOV_OBJECT_STORAGE_BUCKET"],
    endpoint: ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"],
    region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "no-region-needed",
    force_path_style: true
  }

  # Create bucket if using local MinIO (development)
  if LOCAL_MINIO_S3
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

  # Rebuild the AWS client when the mounted Secret content changes.
  class DynamicS3Storage < Shrine::Storage::S3
    def initialize(**options)
      # Don't pass credentials to parent - we'll handle them dynamically
      super(
        **options.except(:access_key_id, :secret_access_key, :session_token)
      )
      @client = nil
      @credential_fingerprint = nil
      @dynamic_options = options
    end

    # Reset client to force credential refresh (called by cron job)
    def refresh_client!
      @client = nil
    end

    # Override methods to handle credential failures gracefully
    def upload(io, id, shrine_metadata: {}, **upload_options)
      super
    rescue Aws::S3::Errors::InvalidAccessKeyId,
           Aws::S3::Errors::SignatureDoesNotMatch,
           Aws::Errors::MissingCredentialsError => e
      Rails.logger.error "S3 credential error during upload: #{e.message}"

      Rails.logger.error "Retrying upload after invalidating client to reread mounted credentials"
      @client = nil
      super # Retry with fresh credentials from mounted files
    end

    # Override download method to handle credential errors
    def download(id, **download_options)
      super
    rescue Aws::S3::Errors::InvalidAccessKeyId,
           Aws::S3::Errors::SignatureDoesNotMatch,
           Aws::Errors::MissingCredentialsError => e
      Rails.logger.error "S3 credential error during download: #{e.message}"
      Rails.logger.error "Retrying download after invalidating client to reread mounted credentials"
      @client = nil
      super # Retry with fresh credentials from mounted files
    end

    # Override exists? method to handle credential errors
    def exists?(id)
      super
    rescue Aws::S3::Errors::InvalidAccessKeyId,
           Aws::S3::Errors::SignatureDoesNotMatch,
           Aws::Errors::MissingCredentialsError => e
      Rails.logger.error "S3 credential error during exists check: #{e.message}"
      Rails.logger.error "Retrying exists check after invalidating client to reread mounted credentials"
      @client = nil
      super # Retry with fresh credentials from mounted files
    end

    # Override object method to ensure it uses our dynamic client
    def object(id)
      resource = Aws::S3::Resource.new(client: client)
      resource.bucket(bucket.name).object(object_key(id))
    end

    private

    def client
      credentials = OpenshiftAwsCredentials.current
      fingerprint =
        Digest::SHA256.hexdigest(
          [
            credentials[:access_key_id],
            credentials[:secret_access_key],
            credentials[:session_token]
          ].join("\0")
        )

      if @client.nil? || @credential_fingerprint != fingerprint
        @client = create_s3_client(credentials)
        @credential_fingerprint = fingerprint
      end

      @client
    end

    # Create a new S3 client with current credentials
    def create_s3_client(credentials)
      return super if LOCAL_MINIO_S3

      return super if Rails.env.test?

      if credentials && credentials[:access_key_id].present?
        Rails.logger.debug "Creating S3 client with mounted secret credentials"
        Aws::S3::Client.new(
          endpoint: @dynamic_options[:endpoint],
          region: @dynamic_options[:region],
          access_key_id: credentials[:access_key_id],
          secret_access_key: credentials[:secret_access_key],
          session_token: credentials[:session_token],
          force_path_style: @dynamic_options[:force_path_style]
        )
      else
        raise "S3 credentials not available and OpenshiftAwsCredentials.current returned empty"
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
      # Get dynamic credentials from database
      begin
        credentials = OpenshiftAwsCredentials.current
      rescue => e
        Rails.logger.debug "Cannot access database for presigned URL credentials: #{e.message}"
        credentials = nil
      end

      if credentials && credentials[:access_key_id].present?
        public_client =
          Aws::S3::Client.new(
            endpoint: ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"],
            region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "no-region-needed",
            access_key_id: credentials[:access_key_id],
            secret_access_key: credentials[:secret_access_key],
            session_token: credentials[:session_token],
            force_path_style: true
          )
      else
        raise "S3 credentials not available for presigned URL generation"
      end
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
