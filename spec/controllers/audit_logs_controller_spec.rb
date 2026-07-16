require "rails_helper"

RSpec.describe Api::AuditLogsController, type: :controller do
  let(:admin_manager) do
    User.create!(
      first_name: "Admin",
      last_name: "Manager",
      email: "audit-logs-controller-admin@example.com",
      password: "P@ssword1",
      role: :admin_manager,
      confirmed_at: Time.current
    )
  end

  let(:employee) do
    User.create!(
      first_name: "Some",
      last_name: "Employee",
      email: "audit-logs-controller-employee@example.com",
      password: "P@ssword1",
      confirmed_at: Time.current
    )
  end

  before { sign_in admin_manager }

  describe "GET #index" do
    it "renders successfully and clears the preload cache afterwards" do
      Current.user = admin_manager
      employee.update!(discarded_at: Time.current)
      Current.user = nil

      get :index

      expect(response).to have_http_status(:success)
      # preload_for/clear_preload are paired via `ensure` - if clear_preload
      # didn't run, this thread-local would still hold the previous request's
      # cache and leak into whatever runs next on the same thread.
      expect(Thread.current[:audit_log_user_cache]).to be_nil
      expect(Thread.current[:audit_log_contractor_onboard_cache]).to be_nil
      expect(Thread.current[:audit_log_permit_application_cache]).to be_nil
    end

    it "resolves the modified user's name in details without per-row queries breaking" do
      Current.user = admin_manager
      employee.update!(discarded_at: Time.current)
      Current.user = nil

      get :index

      body = JSON.parse(response.body)
      entry =
        body["data"].detect do |log|
          log["table_name"] == "users" &&
            log["details"]&.any? { |d| d.include?(employee.name) }
        end
      expect(entry).to be_present
    end
  end
end
