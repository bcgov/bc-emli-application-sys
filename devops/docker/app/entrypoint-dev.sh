#!/bin/bash

# Rails Entrypoint
# If running the rails server then create or migrate existing database
if [ "${1}" == "./bin/rails" ] && [ "${2}" == "server" ]; then
  until nc -z -v -w30 postgres 5432; do
    echo "Waiting for PostgreSQL database (postgres) to start..."
    sleep 1
  done

  echo "*** Preparing Database..."
  
  IS_DOCKER_BUILD=true ./bin/rails db:migrate
fi

bundle exec rails s -b '0.0.0.0' -p 3000
