if ENV['DATABASE_POOL']
  ActiveRecord::Base.connection_pool.disconnect!
  config = ActiveRecord::Base.connection_db_config.configuration_hash
  ActiveRecord::Base.establish_connection(config.merge(pool: ENV['DATABASE_POOL'].to_i))
end
