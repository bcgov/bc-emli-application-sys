#!/bin/bash

# Ensure temp directories exist
mkdir -p /tmp/virus_scan
chmod 755 /tmp/virus_scan

# Wait for ClamAV service to be ready (only if enabled)
if [ "$CLAMAV_ENABLED" = "true" ]; then
    echo "Waiting for ClamAV service to be ready..."
    for i in {1..30}; do
        if echo "PING" | nc -w 2 $CLAMAV_HOST $CLAMAV_PORT 2>/dev/null | grep -q "PONG"; then
            echo "✅ ClamAV service is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  ClamAV service is not ready, continuing anyway"
            echo "   Virus scanning will be disabled until ClamAV is available"
            break
        fi
        echo "Attempt $i/30: ClamAV not ready yet, waiting..."
        sleep 2
    done
else
    echo "ClamAV is disabled, skipping health check"
fi

# Rails Entrypoint
# If running the rails server then create or migrate existing database
# if [ "${1}" == "./bin/rails" ] && [ "${2}" == "server" ]; then
# if IS_APP_SERVER == true; then
if [ -n "$IS_APP_SERVER" ]; then
  until nc -z -v -w30 postgres 5432; do
    echo "Waiting for PostgreSQL database to start..."
    sleep 1
  done

  echo "*** Preparing Database..."
  
  ./bin/rails db:migrate

  echo "*** reindexing models for search..."
  ./bin/rails search:reindex
fi

# bundle exec rails s -b '0.0.0.0' -p 3000
# Clean up any existing PID files
rm -f /app/tmp/pids/server.pid

exec "$@"
