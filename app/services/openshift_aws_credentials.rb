class OpenshiftAwsCredentials
  ACCESS_KEY_PATH =
    ENV.fetch(
      "AWS_ACCESS_KEY_FILE",
      "/run/secrets/aws/BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"
    )

  SECRET_KEY_PATH =
    ENV.fetch(
      "AWS_SECRET_KEY_FILE",
      "/run/secrets/aws/BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"
    )

  class << self
    def current
      {
        access_key_id: read_required(ACCESS_KEY_PATH),
        secret_access_key: read_required(SECRET_KEY_PATH),
        session_token: nil
      }
    end

    private

    def read_required(path)
      value = File.read(path).strip
      raise "AWS credential file is empty: #{path}" if value.empty?

      value
    rescue Errno::ENOENT, Errno::EACCES => e
      raise "Unable to read AWS credential file #{path}: #{e.message}"
    end
  end
end
