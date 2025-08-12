# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  # Disable CSP entirely in development
  unless Rails.env.development?
    config.content_security_policy do |policy|
      cable_ws = ENV["ANYCABLE_URL"]

      # create nonces
      config.content_security_policy_nonce_generator = ->(request) do
        SecureRandom.base64(16)
      end
      config.content_security_policy_nonce_directives = %w[style-src script-src]

      # Base policy: only allow resources from same origin and HTTPS
      policy.default_src :self, :https

      # Uncomment and customize these if needed:
      # policy.font_src    :self, :https, :data       # Allow fonts from self, HTTPS, and embedded data URIs
      # policy.img_src     :self, :https, :data       # Allow images from self, HTTPS, and embedded data URIs
      # policy.object_src  :none                      # Disallow Flash/Java plugins entirely

      # Only allow scripts from self and HTTPS and webpacked eval (will be overridden in dev)
      policy.script_src :self, :https, :unsafe_eval
      # Only allow styles from self and HTTPS
      policy.style_src :self, :https
      # Only allow fetch/WebSocket/XHR to self and HTTPS (overridden in dev)
      policy.connect_src :self, :https, cable_ws if cable_ws.present?
    end
  end
end
