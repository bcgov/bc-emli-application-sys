class HealthController < ActionController::Base
  # GET /health
  # Returns a plain-text known-good string used by GSLB / uptime monitors.
  # Configure the monitor to:
  #   Keep-Alive type : HTTP/S
  #   Keepalive URL   : GET /health HTTP/1.1\r\nHost: <your-hostname>\r\nConnection: Close\r\n\r\n
  #   Match string    : "ok"
  #
  # To manually force a GSLB failover during maintenance, change the response
  # body below to something else (e.g. "maintenance") so the match fails.
  def show
    render plain: "ok", status: :ok
  end
end
