module QueryCounter
  def count_queries
    count = 0
    counter =
      lambda do |*, payload|
        count += 1 unless payload[:name].in?(%w[SCHEMA CACHE])
      end
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record") do
      yield
    end
    count
  end
end

RSpec.configure { |config| config.include QueryCounter }
