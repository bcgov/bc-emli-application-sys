require "sidekiq-cron"
require "sidekiq-unique-jobs"

# Shared configuration for all environments
SHARED_QUEUES = %w[
  virus_scan
  file_processing
  webhooks
  websocket
  model_callbacks
  default
].freeze

def configure_sidekiq_client(config, redis_cfg = nil)
  config.redis = redis_cfg if redis_cfg

  config.client_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Client
  end
end

def configure_sidekiq_server(config, redis_cfg = nil, concurrency = nil)
  config.redis = redis_cfg if redis_cfg
  config.queues = SHARED_QUEUES
  config.concurrency = concurrency || 10 # Default to 10 workers for better throughput

  config.client_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Client
  end

  config.server_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Server
  end

  SidekiqUniqueJobs::Server.configure(config)
end

# Environment-specific configuration
if Rails.env.production? && ENV["IS_DOCKER_BUILD"].blank? # skip this during precompilation in the docker build stage
  redis_cfg = {
    name: ENV["REDIS_SENTINEL_MASTER_SET_NAME"],
    driver: :ruby,
    sentinels:
      Resolv
        .getaddresses(ENV["REDIS_SENTINEL_HEADLESS"])
        .map do |address|
          { host: address, port: (ENV["REDIS_SENTINEL_PORT"]&.to_i || 26_379) }
        end,
    db: (ENV["SIDEKIQ_REDIS_DB"] || 0).to_i,
    role: :master
  }

  Sidekiq.configure_server do |config|
    configure_sidekiq_server(config, redis_cfg, ENV["SIDEKIQ_CONCURRENCY"].to_i)

    # Persist Sidekiq's own logs to a dedicated file on the log PVC for 30 days
    # (the purge cronjob deletes /app/log files older than 30 days), for post-mortem
    # debugging — e.g. tracing which job froze the workers. Sidekiq logs still go to
    # STDOUT (oc logs/Loki) in their native format, and are additionally tee'd to a
    # daily-rotated sidekiq.log, reusing Sidekiq's own formatter and level so the file
    # matches the pod logs exactly (full job context: jid/class/elapsed). Kept separate
    # from application.log to avoid mixing formats.
    sidekiq_level = config.logger.level
    sidekiq_formatter = config.logger.formatter
    stdout_logger = Logger.new($stdout)
    stdout_logger.formatter = sidekiq_formatter
    file_logger = Logger.new(Rails.root.join("log", "sidekiq.log"), "daily")
    file_logger.formatter = sidekiq_formatter
    config.logger = MultiLogger.new(stdout_logger, file_logger)
    config.logger.level = sidekiq_level
  end

  Sidekiq.configure_client do |config|
    configure_sidekiq_client(config, redis_cfg)
  end

  # Load cron schedule in production only
  # load_from_hash! (bang) replaces ALL cron jobs atomically — removes stale Redis entries
  # not in the YAML. load_from_hash (no bang) only adds/updates, leaving removed jobs alive.
  schedule_file = "config/sidekiq_cron_schedule.yml"
  if File.exist?(schedule_file)
    Sidekiq::Cron::Job.load_from_hash! YAML.load_file(schedule_file)
  end
elsif Rails.env.development?
  # Development configuration uses default Redis connection
  Sidekiq.configure_server { |config| configure_sidekiq_server(config) }

  Sidekiq.configure_client { |config| configure_sidekiq_client(config) }

  # Load cron schedule in development for testing
  schedule_file = "config/sidekiq_cron_schedule.yml"
  if File.exist?(schedule_file)
    Sidekiq::Cron::Job.load_from_hash! YAML.load_file(schedule_file)
  end
end
