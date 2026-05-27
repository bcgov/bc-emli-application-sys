require "logger"
require "active_support/logger_silence"

class MultiLogger < Logger
  include ActiveSupport::LoggerSilence

  def initialize(*loggers)
    @loggers = loggers
    @level_override = {}
    # Initialize base Logger internals to avoid runtime warnings.
    super(IO::NULL)
    self.level = Logger::DEBUG
  end

  def level=(severity)
    @level = severity
    @loggers.each do |logger|
      logger.level = severity if logger.respond_to?(:level=)
    end
  end

  def add(severity, message = nil, progname = nil, &block)
    severity ||= UNKNOWN
    threshold =
      begin
        local_level || @level || Logger::DEBUG
      rescue NameError
        @level || Logger::DEBUG
      end
    return true if severity < threshold

    if message.nil?
      if block_given?
        message = block.call
      else
        message = progname
        progname = @progname
      end
    end

    @loggers.each { |logger| logger.add(severity, message, progname) }
    true
  end
end
