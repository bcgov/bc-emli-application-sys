# Make sure RUBY_VERSION matches the Ruby version in .ruby-version and Gemfile
ARG RUBY_VERSION=4.0.0-bookworm

FROM ruby:$RUBY_VERSION

# Rails app lives here
WORKDIR /app

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development" \
    PATH="/usr/local/node/bin:$PATH" \
    npm_config_cache="/app/.npm"

# Install packages needed for both building and running the application
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential curl git libpq-dev libvips node-gyp pkg-config python3 python-is-python3 libjemalloc2 postgresql-client libproj-dev libgeos-dev proj-bin netcat-openbsd fish && \
    rm -rf /var/lib/apt/lists/*

# Use jemalloc to improve memory management
# YJIT exec-mem-size: cap native code cache per process (default 128MB is too large for 1.5Gi pods).
# 32MB is sufficient for a Rails app's hot paths; trade-off is slightly less JIT coverage.
# narenas:2 limits jemalloc arena count (default = ncpus, which wastes memory on multi-core nodes).
ENV LD_PRELOAD="libjemalloc.so.2" \
    MALLOC_CONF="dirty_decay_ms:1000,narenas:2,background_thread:true" \
    RUBY_YJIT_ENABLE="1" \
    RUBYOPT="--yjit-exec-mem-size=32 --yjit-code-gc"

# Install Node.js
ARG NODE_VERSION=24.15.0
RUN curl -sL https://github.com/nodenv/node-build/archive/master.tar.gz | tar xz -C /tmp/ && \
    cd /tmp/node-build-master && ./install.sh && \
    /tmp/node-build-master/bin/node-build "${NODE_VERSION}" /usr/local/node && \
    rm -rf /tmp/node-build-master

RUN npm install -g npm@11.16.0

# Install Ruby gems
COPY Gemfile Gemfile.lock ./
RUN BUNDLER_VERSION="$(ruby -e 'lock = File.read("Gemfile.lock"); puts lock[/^BUNDLED WITH\n\s+([0-9.]+)/m, 1]')" && \
    gem install "bundler:${BUNDLER_VERSION}" && \
    bundle _${BUNDLER_VERSION}_ install

# Install npm and node modules
COPY package.json package-lock.json ./
RUN npm install --maxsockets=50 --ignore-scripts

# Copy application code
COPY . .

# Run postinstall scripts now that app code is present
RUN npm run gen:theme-typings

# Reconcile dependencies after full source copy before bootsnap precompile.
RUN bundle config set --local path "$BUNDLE_PATH" && \
    bundle config set --local without "$BUNDLE_WITHOUT" && \
    bundle install

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Precompiling assets for production without requiring secret RAILS_MASTER_KEY - also compile SSR
ARG VITE_ENABLE_TEMPLATE_FORCE_PUBLISH=true
ARG VITE_BCEID_URL
ARG VITE_BUSINESS_BCEID_REGISTRATION_URL
ARG VITE_BASIC_BCEID_REGISTRATION_URL
ARG VITE_SITEMINDER_LOGOUT_URL
ARG VITE_KEYCLOAK_LOGOUT_URL
ARG VITE_POST_LOGOUT_REDIRECT_URL

ARG VITE_SUBMIT_INVOICE_ENABLED
ARG DEPLOYMENT_TIMESTAMP
ENV DEPLOYMENT_TIMESTAMP=${DEPLOYMENT_TIMESTAMP}

COPY config/database.yml.docker_precompile_dummy /app/config/database.yml
RUN SECRET_KEY_BASE_DUMMY=1 IS_DOCKER_BUILD=true VITE_RUBY_SSR_BUILD_ENABLED=true VITE_ENABLE_TEMPLATE_FORCE_PUBLISH=${VITE_ENABLE_TEMPLATE_FORCE_PUBLISH} VITE_BCEID_URL=${VITE_BCEID_URL} VITE_BUSINESS_BCEID_REGISTRATION_URL=${VITE_BUSINESS_BCEID_REGISTRATION_URL} VITE_BASIC_BCEID_REGISTRATION_URL=${VITE_BASIC_BCEID_REGISTRATION_URL} VITE_POST_LOGOUT_REDIRECT_URL=${VITE_POST_LOGOUT_REDIRECT_URL} VITE_KEYCLOAK_LOGOUT_URL=${VITE_KEYCLOAK_LOGOUT_URL} VITE_SITEMINDER_LOGOUT_URL=${VITE_SITEMINDER_LOGOUT_URL} VITE_SUBMIT_INVOICE_ENABLED=${VITE_SUBMIT_INVOICE_ENABLED} ./bin/rails assets:precompile

# Run and own only the runtime files as a non-root user for security
RUN useradd rails --create-home --shell /usr/bin/fish && \
    chown -R rails:rails /app && \
    chmod -R 777 log tmp db storage 

USER rails:rails

# Entrypoint
ENTRYPOINT ["./devops/docker/app/entrypoint.sh"]

# Replace /bin/sh with fish for interactive shell access via oc rsh
RUN ln -sf /usr/bin/fish /bin/sh

LABEL maintainer="Darrel Siegle <darrel.siegle@dxcas.com>" \
      description="Docker image for the BC Home Energy Savings Program System" \
      version="1.0.0"

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["./bin/rails", "server"]
