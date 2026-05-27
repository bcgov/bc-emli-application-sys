# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  config.content_security_policy do |policy|
    # DEV-only: Loosen restrictions to support local tooling like Vite, Reactotron, and ActionCable
    if Rails.env.development?
      vite_host = "ws://localhost:3036" # Vite dev server WebSocket
      reactotron_ws = "ws://localhost:9090" # Reactotron debugging WebSocket
      cable_ws = "ws://localhost:8080" # ActionCable WebSocket (or any custom WS server)
      minio_url = "http://localhost:9000"

      policy.script_src :self, :https, :unsafe_eval, :unsafe_inline, vite_host
      policy.style_src :self, :https, :unsafe_eval, :unsafe_inline, vite_host
      policy.connect_src :self,
                         :https,
                         vite_host,
                         reactotron_ws,
                         cable_ws,
                         minio_url
    else
      cable_ws = ENV["ANYCABLE_URL"]

      # create nonces
      config.content_security_policy_nonce_generator = ->(request) do
        SecureRandom.base64(16)
      end
      config.content_security_policy_nonce_directives = %w[style-src script-src]

      # Base policy: only allow resources from same origin and HTTPS
      policy.default_src :self, :https

      # Allow fonts and images from trusted origins plus data/blob URIs used by icon/fonts libraries.
      policy.font_src :self, :https, :data
      policy.img_src :self, :https, :data, :blob
      policy.object_src :none

      # Only allow scripts from self and HTTPS and webpacked eval (will be overridden in dev)
      policy.script_src :self, :https, :unsafe_eval
      # Only allow styles from self and HTTPS (nonce is injected automatically for style/script tags).
      policy.style_src :self, :https
      # Allow inline style attributes used by third-party UI libs (e.g. icon/svg and form renderers).
      policy.style_src_attr :unsafe_inline
      # Only allow fetch/WebSocket/XHR to self and HTTPS (overridden in dev)
      policy.connect_src :self, :https, cable_ws if cable_ws.present?
    end
  end
end
