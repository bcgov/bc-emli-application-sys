module FrontendUrlHelper
  def self.root_url
    Rails.application.routes.url_helpers.root_url
  end

  def self.frontend_url(path)
    base_url =
      Rails.application.routes.url_helpers.root_url(
        Rails.application.config.action_mailer.default_url_options
      )
    Addressable::URI.join(base_url, path).to_s
  end
end
