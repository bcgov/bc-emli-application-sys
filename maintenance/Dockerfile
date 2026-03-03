# Use official nginx alpine image for smallest footprint
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/* && \
    mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp && \
    chgrp -R 0 /usr/share/nginx/html /etc/nginx /var/cache/nginx /var/log/nginx /var/run /tmp/nginx && \
    chmod -R g=u /usr/share/nginx/html /etc/nginx /var/cache/nginx /var/log/nginx /var/run /tmp/nginx

# Copy custom nginx configuration
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy maintenance page
COPY index.html /usr/share/nginx/html/

# Expose port 8080 (non-privileged port)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
