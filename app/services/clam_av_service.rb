# Service for scanning files using ClamAV daemon
class ClamAvService
  CLAMAV_HOST = ENV.fetch("CLAMAV_HOST", "127.0.0.1") # Use localhost when ClamAV is in same container
  CLAMAV_PORT = ENV.fetch("CLAMAV_PORT", 3310).to_i
  SCAN_TIMEOUT = ENV.fetch("CLAMAV_TIMEOUT", 30).to_i

  class ScanError < StandardError
  end
  class TimeoutError < ScanError
  end
  class ConnectionError < ScanError
  end

  def self.enabled?
    ENV.fetch("CLAMAV_ENABLED", "true") == "true"
  end

  def self.ping
    return false unless enabled?

    begin
      socket = TCPSocket.new(CLAMAV_HOST, CLAMAV_PORT)
      socket.write("PING\n")
      response = socket.read(4)
      socket.close
      response == "PONG"
    rescue => e
      Rails.logger.warn "ClamAV ping failed: #{e.message}" if defined?(Rails)
      false
    end
  end

  def self.scan_file(file_path)
    new.scan_file(file_path)
  end

  def scan_file(file_path)
    unless File.exist?(file_path)
      return { status: :error, message: "File not found: #{file_path}" }
    end

    begin
      result = scan_with_clamav(file_path)
      parse_scan_result(result)
    rescue Errno::ECONNREFUSED, Errno::EHOSTUNREACH => e
      Rails.logger.error "ClamAV connection error: #{e.message}"
      { status: :error, message: "Unable to connect to ClamAV daemon" }
    rescue Timeout::Error => e
      Rails.logger.error "ClamAV scan timeout: #{e.message}"
      { status: :error, message: "Scan timeout" }
    rescue StandardError => e
      Rails.logger.error "ClamAV scan error: #{e.message}"
      { status: :error, message: "Scan failed: #{e.message}" }
    end
  end

  private

  def scan_with_clamav(file_path)
    socket = TCPSocket.new(CLAMAV_HOST, CLAMAV_PORT)

    # Use INSTREAM command to send file data
    socket.write("zINSTREAM\0")

    File.open(file_path, "rb") do |file|
      while chunk = file.read(8192)
        size = [chunk.size].pack("N")
        socket.write(size)
        socket.write(chunk)
      end
    end

    # Send zero-length chunk to indicate end of stream
    socket.write([0].pack("N"))

    # Read response with timeout
    response = nil
    Timeout.timeout(SCAN_TIMEOUT) { response = socket.read }

    socket.close
    response
  rescue => e
    socket&.close
    raise e
  end

  def parse_scan_result(result)
    if result.nil? || result.empty?
      return { status: :error, message: "Empty response from ClamAV" }
    end

    result = result.strip
    Rails.logger.info "ClamAV scan result: #{result}"

    case result
    when /stream: OK/
      { status: :clean, message: "File is clean" }
    when /stream: (.+) FOUND/
      virus_name = $1
      {
        status: :infected,
        message: "Virus detected: #{virus_name}",
        virus_name: virus_name
      }
    when /ERROR/
      { status: :error, message: "ClamAV error: #{result}" }
    else
      { status: :error, message: "Unknown ClamAV response: #{result}" }
    end
  end
end
