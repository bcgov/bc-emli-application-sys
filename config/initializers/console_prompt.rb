return unless defined?(Rails::Console)

app = Rails.application

# Rails 8 builds the prompt inside Rails::Console::IRBConsole; override only the
# environment label source so OpenShift can display dev/test/prod independently
# as they all run in "production" Rails environment.
# If RAILS_CONSOLE_ENV_LABEL is not set, fall back to the default environment-based labels.
require "rails/commands/console/irb_console"

custom_console_class =
  Class.new(Rails::Console::IRBConsole) do
    def colorized_env
      label = ENV["RAILS_CONSOLE_ENV_LABEL"].presence
      return super if label.blank?

      color =
        case label
        when "dev", "development", "test"
          [:BLUE]
        when "prod", "production"
          [:RED]
        else
          [:MAGENTA]
        end

      IRB::Color.colorize(label, color)
    end
  end

app.config.console = custom_console_class.new(app)
