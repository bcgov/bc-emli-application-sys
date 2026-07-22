require "rails_helper"

RSpec.describe Api::ContractorsController, type: :controller do
  let(:admin_user) do
    User.create!(
      first_name: "Admin",
      last_name: "User",
      email: "csc-admin@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:admin_manager_user) do
    User.create!(
      first_name: "Manager",
      last_name: "User",
      email: "csc-mgr@example.com",
      password: "P@ssword1",
      role: :admin_manager,
      confirmed_at: Time.current
    )
  end

  let(:participant_user) do
    User.create!(
      first_name: "Part",
      last_name: "User",
      email: "csc-part@example.com",
      password: "P@ssword1",
      role: :participant,
      confirmed_at: Time.current
    )
  end

  let(:contractor) do
    Contractor.create!(
      business_name: "Controller Spec Contractor",
      contact: admin_user
    )
  end

  let(:onboard_application) do
    create(:permit_application, submitter: contractor)
  end

  let!(:onboard) do
    ContractorOnboard.create!(
      contractor: contractor,
      onboard_application: onboard_application
    )
  end

  def json_response
    JSON.parse(response.body)
  end

  before do
    # Keep the specs off Elasticsearch - the actions call @contractor.reindex.
    allow_any_instance_of(Contractor).to receive(:reindex)
    sign_in admin_user
  end

  describe "POST #suspend" do
    it "suspends and records a suspend event with reason + actor" do
      post :suspend, params: { id: contractor.id, reason: "late invoices" }

      expect(response).to have_http_status(:success)
      event = contractor.contractor_status_events.order(:created_at).last
      expect(event.event_type).to eq("suspend")
      expect(event.reason).to eq("late invoices")
      expect(event.performed_by_id).to eq(admin_user.id)
      expect(event.contractor_onboard_id).to eq(onboard.id)
      expect(onboard.reload.suspended_at).to be_present
    end

    it "rolls back the suspend if the event write fails (atomic)" do
      allow_any_instance_of(ContractorStatusEvent).to receive(
        :valid?
      ).and_return(false)

      post :suspend, params: { id: contractor.id, reason: "late invoices" }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(contractor.contractor_status_events.count).to eq(0)
      expect(onboard.reload.suspended_at).to be_nil
    end
  end

  describe "POST #unsuspend" do
    before do
      onboard.update!(
        suspended_at: Time.current,
        suspended_reason: "prior reason",
        suspended_by: admin_user
      )
    end

    it "unsuspends and records an unsuspend event with no reason" do
      post :unsuspend, params: { id: contractor.id }

      expect(response).to have_http_status(:success)
      event = contractor.contractor_status_events.order(:created_at).last
      expect(event.event_type).to eq("unsuspend")
      expect(event.reason).to be_nil
      expect(event.performed_by_id).to eq(admin_user.id)
      expect(onboard.reload.suspended_at).to be_nil
    end
  end

  describe "POST #deactivate" do
    it "removes and records a remove event with reason" do
      post :deactivate, params: { id: contractor.id, reason: "business closed" }

      expect(response).to have_http_status(:success)
      event = contractor.contractor_status_events.order(:created_at).last
      expect(event.event_type).to eq("remove")
      expect(event.reason).to eq("business closed")
      expect(onboard.reload.deactivated_at).to be_present
    end
  end

  describe "GET #status_history" do
    let!(:suspend_event) do
      ContractorStatusEvent.create!(
        contractor: contractor,
        contractor_onboard: onboard,
        event_type: "suspend",
        reason: "first",
        performed_by: admin_user,
        created_at: 2.hours.ago
      )
    end

    let!(:unsuspend_event) do
      ContractorStatusEvent.create!(
        contractor: contractor,
        contractor_onboard: onboard,
        event_type: "unsuspend",
        performed_by: admin_user,
        created_at: 1.hour.ago
      )
    end

    it "returns events newest-first" do
      get :status_history, params: { id: contractor.id }

      expect(response).to have_http_status(:success)
      types = json_response["data"].map { |e| e["event_type"] }
      expect(types).to eq(%w[unsuspend suspend])
    end

    it "is authorized for an admin_manager" do
      sign_in admin_manager_user
      get :status_history, params: { id: contractor.id }
      expect(response).to have_http_status(:success)
    end

    it "is forbidden for a participant" do
      sign_in participant_user
      get :status_history, params: { id: contractor.id }
      expect(response).to have_http_status(:forbidden)
    end
  end
end
