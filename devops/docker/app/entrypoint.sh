#!/bin/bash

# -e          : causes script to fail if any command below has non-zero exit status
# -u          : a reference to any variable you haven't previously defined cause immediate exit
# -o pipefail : prevents errors in a pipeline from being masked. If any command in a pipeline fails, 
#               that return code will be used as the return code of the whole pipeline.

# Increase file descriptor limit for Vite precompile later
ulimit -n 65536

set -euo pipefail 

# Rails Entrypoint
# If running the rails server then create or migrate existing database
# if [ "${1}" == "./bin/rails" ] && [ "${2}" == "server" ]; then
if [ -n "$IS_APP_SERVER" ]; then
  if [ -f /app/tmp/pids/server.pid ]; then
    echo "[entrypoint] Removing stale server PID file at /app/tmp/pids/server.pid"
    rm -f /app/tmp/pids/server.pid
  fi
  
  until nc -z -v -w30 ${DATABASE_OPENSHIFT_SERVICE_HOST} 5432; do
    echo "Waiting for PostgreSQL database (${DATABASE_OPENSHIFT_SERVICE_HOST}) to start..."
    sleep 1
  done

  echo "*** Migrating Database..."
  
  ./bin/rails db:migrate

  echo "*** Reindexing models for search..."
  
  bundle exec rails search:reindex
fi

exec "$@"