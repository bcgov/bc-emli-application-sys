#!/bin/bash

# Start ClamAV daemon in background
echo "*** Starting ClamAV daemon..."
# Ensure directories exist and have correct permissions
mkdir -p /var/run/clamav /var/log/clamav /tmp/virus_scan
chown clamav:clamav /var/run/clamav /var/log/clamav
chmod 755 /tmp/virus_scan

# Kill any existing ClamAV processes
pkill -f clamd || true
pkill -f freshclam || true

# Wait for processes to stop
sleep 2

# Ensure ClamAV config is correct - force TCP mode
echo "TCPSocket 3310" > /etc/clamav/clamd.conf.local
echo "TCPAddr 127.0.0.1" >> /etc/clamav/clamd.conf.local
echo "# Local socket disabled for Docker" >> /etc/clamav/clamd.conf.local
cat /etc/clamav/clamd.conf | grep -v "^LocalSocket" | grep -v "^LocalSocketGroup" | grep -v "^LocalSocketMode" | grep -v "^PidFile" >> /etc/clamav/clamd.conf.local
mv /etc/clamav/clamd.conf.local /etc/clamav/clamd.conf

# Update virus database if needed (non-blocking)
freshclam --daemon > /var/log/clamav/freshclam.log 2>&1 &

# Start clamd daemon in foreground mode initially to check for errors
echo "Starting ClamAV daemon..."
clamd --foreground &
CLAMD_PID=$!

# Wait for ClamAV to start and test connection
echo "Waiting for ClamAV to start..."
for i in {1..30}; do
    if echo "PING" | nc -w 2 127.0.0.1 3310 2>/dev/null | grep -q "PONG"; then
        echo "✅ ClamAV daemon is running and responding"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ ClamAV failed to start properly"
        # Show clamd logs for debugging
        echo "=== ClamAV logs ==="
        tail -20 /var/log/clamav/clamav.log 2>/dev/null || echo "No ClamAV log file found"
    fi
    echo "Attempt $i/30: ClamAV not ready yet, waiting..."
    sleep 2
done

# Rails Entrypoint
# If running the rails server then create or migrate existing database
# if [ "${1}" == "./bin/rails" ] && [ "${2}" == "server" ]; then
# if IS_APP_SERVER == true; then
if [ -n "$IS_APP_SERVER" ]; then
  until nc -z -v -w30 postgres 5432; do
    echo "Waiting for PostgreSQL database (postgres) to start..."
    sleep 1
  done

  echo "*** Preparing Database..."
  
  ./bin/rails db:migrate
fi

# bundle exec rails s -b '0.0.0.0' -p 3000
exec "$@"
