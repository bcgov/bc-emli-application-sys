# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require_relative "config/application"

begin
	require "data_migrate"
rescue LoadError
	# Ignore when the gem group is excluded in a minimal environment.
end

Rails.application.load_tasks
