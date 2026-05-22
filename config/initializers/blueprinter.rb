# epoch in milliseconds needed for js FE
Blueprinter.configure do |config|
  config.datetime_format = ->(datetime) do
    dt = datetime.respond_to?(:to_f) ? datetime : datetime.to_time
    (dt.to_f * 1000).to_i
  end
end
