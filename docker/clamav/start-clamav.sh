#!/bin/bash
set -e

echo "Starting ClamAV container..."

# Check if virus definitions exist, if not download them
if [ ! -f /var/lib/clamav/main.cvd ] && [ ! -f /var/lib/clamav/main.cld ]; then
    echo "Downloading initial virus definitions..."
    freshclam --quiet || {
        echo "Warning: Could not download initial virus definitions"
        echo "Container will start but scanning may not work properly"
    }
else
    echo "Virus definitions found, checking for updates..."
    freshclam --quiet || echo "Warning: Could not update virus definitions"
fi

# Ensure log files exist with proper permissions
touch /var/log/clamav/clamav.log
touch /var/log/clamav/freshclam.log

# Start ClamAV daemon
echo "Starting ClamAV daemon..."
exec clamd --config-file=/etc/clamav/clamd.conf --foreground
