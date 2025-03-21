require "active_support/core_ext/integer/time"
Rails.application.configure do
  # Specify AnyCable WebSocket server URL to use by JS client
  config.after_initialize do
    config.action_cable.url =
      ActionCable.server.config.url =
        ENV.fetch(
          "ANYCABLE_URL",
          "ws://localhost:8080/cable"
        ) if AnyCable::Rails.enabled?
    Bullet.enable = true
    Bullet.bullet_logger = true # Log to the Bullet log file (Rails.root/log/bullet.log)
    Bullet.console = true # Log warnings to the browser's console.log
    Bullet.rails_logger = true # Add warnings to the Rails log
    # Optional: Enable these settings to fine-tune Bullet's behavior
    Bullet.n_plus_one_query_enable = true
    Bullet.unused_eager_loading_enable = true
    Bullet.counter_cache_enable = true
  end
  # Ensure logger outputs to STDOUT
  config.logger = Logger.new($stdout)
  config.log_level = :debug
  # Define color codes
  COLORS = {
    "DEBUG" => "\e[34m", # Blue
    "INFO" => "\e[32m", # Green
    "WARN" => "\e[33m", # Yellow
    "ERROR" => "\e[31m", # Red
    "FATAL" => "\e[35m", # Magenta
    "UNKNOWN" => "\e[37m" # White
  }
  # Use tagged logging for better context in your logs
  # Enable detailed logging for errors
  config.log_level = :debug
  config.logger.formatter =
    proc do |severity, timestamp, progname, msg|
      color = COLORS[severity] || "\e[37m" # Default to white if no color is defined
      # Include the stack trace with the error message
      if severity == "ERROR" || severity == "FATAL"
        msg = "#{msg}\n#{caller.join("\n")}" # Append stack trace (caller)
      end
      "[#{timestamp.iso8601}] #{color}#{severity}\e[0m #{progname}: #{msg}\n"
    end

  # Custom logger to log query results after SQL queries
  # ActiveSupport::Notifications.subscribe(
  #   "sql.active_record"
  # ) do |name, start, finish, id, payload|
  #   Rails.logger.debug("SQL ActiveRecord Notification Fired")
  #   sql = payload[:sql]
  #   # Log only SELECT queries and their results
  #   if sql =~ /^SELECT/i
  #     Rails.logger.debug("SQL Query: #{sql}")
  #     result = ActiveRecord::Base.connection.select_all(sql)
  #     Rails.logger.debug("Query Result: #{result.to_a}")
  #   end
  # end
  # Set a specific logger for ActiveRecord with a more concise output
  # config.active_record.logger = Logger.new($stdout)
  # config.active_record.logger.level = Logger::DEBUG
  # Settings specified here will take precedence over those in config/application.rb.
  # In the development environment your application's code is reloaded any time
  # it changes. This slows down response time but is perfect for development
  # since you don't have to restart the web server when you make code changes.
  config.enable_reloading = true
  # Do not eager load code on boot.
  config.eager_load = false
  # Show full error reports.
  config.consider_all_requests_local = true
  # Enable server timing
  config.server_timing = true
  # Enable/disable caching. By default caching is disabled.
  # Run rails dev:cache to toggle caching.
  if Rails.root.join("tmp/caching-dev.txt").exist?
    config.action_controller.perform_caching = true
    config.action_controller.enable_fragment_cache_logging = true
    config.cache_store =
      :redis_cache_store,
      { url: "#{ENV["CACHE_DEV_REDIS_URL"]}", namespace: "cache" }
    config.public_file_server.headers = {
      "Cache-Control" => "public, max-age=#{2.days.to_i}"
    }
  else
    config.action_controller.perform_caching = false
    config.cache_store = :null_store
  end
  # Print deprecation notices to the Rails logger.
  config.active_support.deprecation = :log
  # Raise exceptions for disallowed deprecations.
  config.active_support.disallowed_deprecation = :raise
  # Tell Active Support which deprecation messages to disallow.
  config.active_support.disallowed_deprecation_warnings = []
  # Raise an error on page load if there are pending migrations.
  config.active_record.migration_error = :page_load
  # Highlight code that triggered database queries in logs.
  config.active_record.verbose_query_logs = true
  # Raises error for missing translations.
  # config.i18n.raise_on_missing_translations = true
  # Annotate rendered view with file names.
  # config.action_view.annotate_rendered_view_with_filenames = true
  # Uncomment if you wish to allow Action Cable access from any origin.
  # config.action_cable.disable_request_forgery_protection = true
  # Raise error when a before_action's only/except options reference missing actions
  config.action_controller.raise_on_missing_callback_actions = true
  config.action_mailer.delivery_method = :letter_opener
  config.action_mailer.default_url_options = {
    host: "localhost",
    port: 3000,
    protocol: "http"
  }
  # when running in a docker container locally we need to be able to view the logs from the containers IP
  config.web_console.whitelisted_ips = ["0.0.0.0/0"]
  config.after_initialize do
    Rails.application.routes.default_url_options =
      Rails.application.config.action_mailer.default_url_options
  end
end
