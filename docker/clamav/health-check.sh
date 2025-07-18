#!/bin/bash

# Health check for ClamAV daemon
set -e

# Check if ClamAV daemon is responding
if echo "PING" | nc -w 5 localhost 3310 2>/dev/null | grep -q "PONG"; then
    echo "ClamAV daemon is healthy"
    exit 0
else
    echo "ClamAV daemon is not responding"
    exit 1
fi
