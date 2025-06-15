class ChesEmailDelivery
  attr_accessor :config, :client, :bearer_token, :delivery_method

  def initialize(config)
    Rails.logger.info "[CHES] Initialized with config: #{config}"
    @config = config

    obtain_bearer_token
    @client =
      Faraday.new(url: "#{ENV["CHES_HOST"]}/api/v1") do |conn|
        conn.headers["Content-Type"] = "application/json"
        conn.request :authorization, :bearer, @bearer_token
        conn.adapter Faraday.default_adapter
      end
  end

  def deliver!(mail)
    Rails.logger.info "[CHES] Delivering email to #{mail.to}"
    ensure_ches_token_is_valid_and_health_check_passes
    params = {
      to: mail.to,
      from: mail[:from].to_s,
      bcc: mail.bcc,
      cc: mail.cc,
      encoding: "utf-8",
      priority: "normal",
      subject: mail.subject,
      attachments: [],
      body: mail.body.to_s,
      bodyType: body_type(mail)
    }

    Rails.logger.debug "[CHES] Request params: #{params}"
    response = client.post("email", params.to_json)

    if response.success?
      body = JSON.parse(response.body)
      Rails.logger.info "[CHES] Email sent successfully. msgId=#{body.dig("messages", 0, "msgId")}"
      return body.dig("messages", 0, "msgId")
    else
      Rails.logger.error "[CHES] Failed to send email: #{response.status} #{response.body}"
      #raise "CHES email delivery failed: #{response.status} #{response.body}"
    end
  end

  def body_type(mail)
    case mail.content_type
    when mail.content_type.include?("text/html")
      "html"
    when mail.content_type.include?("text/plain")
      "text"
    else
      "html"
    end
  end

  def email_status(msg_id)
    ensure_ches_token_is_valid_and_health_check_passes

    response = client.get("status/#{msg_id}")
    JSON.parse(response.body) if response.success?
  end

  private

  def ensure_ches_token_is_valid_and_health_check_passes
    response = client.get("health")
    return if response.success?

    if response.status == 401
      obtain_bearer_token
      ensure_ches_token_is_valid_and_health_check_passes
    else
      Rails.logger.error "ERROR: CHES Healthcheck failed - check with bcgov service status"
      raise "ERROR: CHES Healthcheck failed - check with bcgov service status"
    end
  end

  def obtain_bearer_token
    auth_client =
      Faraday.new(url: ENV["CHES_AUTH_HOST"]) do |conn|
        conn.request :url_encoded
        conn.request :authorization,
                     :basic,
                     ENV["CHES_CLIENT_ID"],
                     ENV["CHES_CLIENT_SECRET"]
        conn.adapter Faraday.default_adapter
      end

    response =
      auth_client.post(
        "auth/realms/comsvcauth/protocol/openid-connect/token"
      ) { |req| req.body = { grant_type: "client_credentials" } }

    if response.success?
      body = JSON.parse(response.body)
      self.bearer_token = body["access_token"]
    else
      Rails.logger.error "Error: Unable to authenticate with CHES - check ENV vars"
      raise "Error: Unable to authenticate with CHES - check ENV vars"
    end
  end
end
