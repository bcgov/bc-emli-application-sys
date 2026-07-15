require "rails_helper"

RSpec.describe "API Sessions", type: :request do
  let(:password) { "P@ssword1" }
  let(:login_params) { { user: { email: user.email, password: password } } }
  let!(:user) do
    create(
      :user,
      email: "auth-user@example.com",
      password: password,
      confirmed_at: Time.current
    )
  end

  before do
    allow_any_instance_of(Api::SessionsController).to receive(
      :verify_authenticity_token
    )
  end

  around do |example|
    original_value = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = false
    example.run
  ensure
    ActionController::Base.allow_forgery_protection = original_value
  end

  def joined_set_cookie_header
    Array(response.headers["Set-Cookie"]).join("\n")
  end

  describe "POST /api/login" do
    it "sets the JWT access_token cookie" do
      post "/api/login", params: login_params, as: :json

      expect(response).to have_http_status(:created)
      expect(joined_set_cookie_header).to include("access_token=")
      expect(joined_set_cookie_header).to include("httponly")
    end
  end

  describe "GET /api/logout" do
    it "clears the JWT access_token cookie" do
      post "/api/login", params: login_params, as: :json

      expect(joined_set_cookie_header).to include("access_token=")

      access_token_cookie =
        Array(response.headers["Set-Cookie"]).find do |cookie|
          cookie.start_with?("access_token=")
        end

      get "/api/logout", headers: { "Cookie" => access_token_cookie }

      expect(response).to have_http_status(:ok)
      expect(joined_set_cookie_header).to include("access_token=")
      expect(joined_set_cookie_header).to include("max-age=0")
    end
  end
end
