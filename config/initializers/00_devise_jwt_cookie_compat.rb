# frozen_string_literal: true

require "warden"

module Devise
  module JWT
    module CookieCompat
      class Config
        attr_accessor :name, :secure, :domain

        def initialize
          @name = "access_token"
          @secure = true
          @domain = nil
        end
      end

      def self.config
        @config ||= Config.new
      end

      class CookieHelper
        def initialize(config = CookieCompat.config)
          @config = config
        end

        def build(token)
          token.nil? ? remove_cookie : create_cookie(token)
        end

        def read_from(cookies)
          cookies[@config.name]
        end

        private

        def create_cookie(token)
          jwt = Warden::JWTAuth::TokenDecoder.new.call(token)
          cookie = {
            value: token,
            path: "/",
            httponly: true,
            secure: @config.secure,
            expires: Time.at(jwt["exp"].to_i)
          }
          cookie[:domain] = @config.domain if @config.domain.present?
          [@config.name, cookie]
        end

        def remove_cookie
          cookie = {
            value: nil,
            path: "/",
            httponly: true,
            secure: @config.secure,
            max_age: "0",
            expires: Time.at(0)
          }
          cookie[:domain] = @config.domain if @config.domain.present?
          [@config.name, cookie]
        end
      end

      class Strategy < Warden::Strategies::Base
        def valid?
          !token.nil?
        end

        def store?
          false
        end

        def authenticate!
          user = Warden::JWTAuth::UserDecoder.new.call(token, scope, nil)
          success!(user)
        rescue JWT::DecodeError => e
          fail!(e.message)
        end

        private

        def token
          @token ||= CookieHelper.new.read_from(cookies)
        end
      end

      class Middleware
        ENV_KEY = "warden-jwt_auth.token"

        def initialize(app)
          @app = app
          @config = Warden::JWTAuth.config
        end

        def call(env)
          token_should_be_revoked = token_should_be_revoked?(env)
          if token_should_be_revoked
            request = ActionDispatch::Request.new(env)
            token = CookieHelper.new.read_from(request.cookies)
            env["HTTP_AUTHORIZATION"] = "Bearer #{token}" if token.present?
          end

          status, headers, response = @app.call(env)

          if headers["Authorization"] && env[ENV_KEY]
            name, cookie = CookieHelper.new.build(env[ENV_KEY])
            Rack::Utils.set_cookie_header!(headers, name, cookie)
          elsif token_should_be_revoked
            name, cookie = CookieHelper.new.build(nil)
            Rack::Utils.set_cookie_header!(headers, name, cookie)
          end

          [status, headers, response]
        end

        private

        def token_should_be_revoked?(env)
          path_info = env["PATH_INFO"] || ""
          method = env["REQUEST_METHOD"]
          @config
            .revocation_requests
            .any? do |revocation_method, revocation_path|
            path_info.match(revocation_path) && method == revocation_method
          end
        end
      end
    end
  end

  module Models
    module JwtCookieAuthenticatable
      extend ActiveSupport::Concern

      included do
        def self.find_for_jwt_authentication(sub)
          find_by(primary_key => sub)
        end
      end

      def jwt_subject
        id
      end
    end
  end

  def self.jwt_cookie
    yield(Devise::JWT::CookieCompat.config)
  end

  add_module(:jwt_cookie_authenticatable, strategy: :jwt_cookie)
end

Warden::Strategies.add(:jwt_cookie, Devise::JWT::CookieCompat::Strategy)
Rails.application.config.middleware.insert_before(
  Warden::JWTAuth::Middleware,
  Devise::JWT::CookieCompat::Middleware
)
