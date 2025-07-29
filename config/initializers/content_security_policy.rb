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

      policy.script_src :self, :https, :unsafe_eval, :unsafe_inline, vite_host
      policy.style_src :self, :https, :unsafe_eval, :unsafe_inline, vite_host
      policy.connect_src :self, :https, vite_host, reactotron_ws, cable_ws
    else
      # create nonces
      config.content_security_policy_nonce_generator = ->(request) do
        SecureRandom.base64(16)
      end
      config.content_security_policy_nonce_directives = %w[style-src script-src]

      # Base policy: only allow resources from same origin and HTTPS
      policy.default_src :self, :https

      # Uncomment and customize these as needed:
      # policy.font_src    :self, :https, :data       # Allow fonts from self, HTTPS, and embedded data URIs
      # policy.img_src     :self, :https, :data       # Allow images from self, HTTPS, and embedded data URIs
      # policy.object_src  :none                      # Disallow Flash/Java plugins entirely

      policy.script_src :self, :https, :unsafe_eval # Only allow scripts from self and HTTPS and webpacked eval (will be overridden in dev)
      policy.style_src :self, :https # Only allow styles from self and HTTPS
      policy.connect_src :self, :https # Only allow fetch/WebSocket/XHR to self and HTTPS (overridden in dev)
    end
  end
end

# You may need to enable this in production as well depending on your setup.
#    policy.script_src *policy.script_src, :blob if Rails.env.test?

#     policy.style_src   :self, :https
# Allow @vite/client to hot reload style changes in development
#    policy.style_src *policy.style_src, :unsafe_inline if Rails.env.development?

#     # Specify URI for violation reports
#     # policy.report_uri "/csp-violation-report-endpoint"

#
#   # Generate session nonces for permitted importmap, inline scripts, and inline styles.
#   config.content_security_policy_nonce_generator = ->(request) { request.session.id.to_s }
#   config.content_security_policy_nonce_directives = %w(script-src style-src)
#
#   # Report violations without enforcing the policy.
#   # config.content_security_policy_report_only = true
