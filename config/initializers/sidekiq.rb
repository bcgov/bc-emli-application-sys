require "sidekiq-cron"
require "sidekiq-unique-jobs"

# Shared configuration for all environments
SHARED_QUEUES = %w[
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
  config.concurrency = concurrency if concurrency

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
  end

  Sidekiq.configure_client do |config|
    configure_sidekiq_client(config, redis_cfg)
  end

  # Load cron schedule in production only
  schedule_file = "config/sidekiq_cron_schedule.yml"
  if File.exist?(schedule_file)
    Sidekiq::Cron::Job.load_from_hash YAML.load_file(schedule_file)
  end
elsif Rails.env.development?
  # Development configuration uses default Redis connection
  Sidekiq.configure_server { |config| configure_sidekiq_server(config) }

  Sidekiq.configure_client { |config| configure_sidekiq_client(config) }
end
