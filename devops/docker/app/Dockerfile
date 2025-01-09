# Final Application Image
FROM artifacts.developer.gov.bc.ca/bbfc-local/node-gem-base:latest

# Copy application code
WORKDIR /app
COPY . ./

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Precompile assets
ARG VITE_ENABLE_TEMPLATE_FORCE_PUBLISH
ARG VITE_BCEID_URL
ARG VITE_BUSINESS_BCEID_REGISTRATION_URL
ARG VITE_BASIC_BCEID_REGISTRATION_URL
ARG VITE_SITEMINDER_LOGOUT_URL
ARG VITE_KEYCLOAK_LOGOUT_URL
ARG VITE_POST_LOGOUT_REDIRECT_URL
COPY database.yml.docker_precompile_dummy /app/config/database.yml
RUN SECRET_KEY_BASE_DUMMY=1 IS_DOCKER_BUILD=true VITE_RUBY_SSR_BUILD_ENABLED=true \
    VITE_ENABLE_TEMPLATE_FORCE_PUBLISH=${VITE_ENABLE_TEMPLATE_FORCE_PUBLISH} \
    VITE_BCEID_URL=${VITE_BCEID_URL} \
    VITE_BUSINESS_BCEID_REGISTRATION_URL=${VITE_BUSINESS_BCEID_REGISTRATION_URL} \
    VITE_BASIC_BCEID_REGISTRATION_URL=${VITE_BASIC_BCEID_REGISTRATION_URL} \
    VITE_POST_LOGOUT_REDIRECT_URL=${VITE_POST_LOGOUT_REDIRECT_URL} \
    VITE_KEYCLOAK_LOGOUT_URL=${VITE_KEYCLOAK_LOGOUT_URL} \
    VITE_SITEMINDER_LOGOUT_URL=${VITE_SITEMINDER_LOGOUT_URL} \
    ./bin/rails assets:precompile

# Set up a non-root user for security
RUN useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails /app && \
    chmod -R 777 log tmp db storage

USER rails:rails

# Entrypoint - source vault variables from Hashicorp
ENTRYPOINT ["./devops/docker/app/entrypoint.sh"]

LABEL maintainer="Darrel Siegle <darrel.siegle@dxcas.com>"

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["./bin/rails", "server"]
