FROM ubuntu:22.04

# Install ClamAV and dependencies
RUN apt-get update && apt-get install -y \
    clamav \
    clamav-daemon \
    clamav-freshclam \
    netcat-traditional \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories with proper permissions
RUN mkdir -p /var/lib/clamav /var/log/clamav /var/run/clamav /var/lib/clamav/tmp && \
    chown -R clamav:clamav /var/lib/clamav /var/log/clamav /var/run/clamav && \
    chmod 755 /var/lib/clamav /var/lib/clamav/tmp

# Copy configuration files
COPY clamd.conf /etc/clamav/clamd.conf
COPY freshclam.conf /etc/clamav/freshclam.conf

# Copy startup and health check scripts
COPY start-clamav.sh /usr/local/bin/start-clamav.sh
COPY health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/start-clamav.sh /usr/local/bin/health-check.sh

# Create log file with proper permissions
RUN touch /var/log/clamav/clamav.log && \
    chown clamav:clamav /var/log/clamav/clamav.log

# Expose ClamAV daemon port
EXPOSE 3310

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Switch to clamav user
USER clamav

# Start ClamAV daemon
CMD ["/usr/local/bin/start-clamav.sh"]
