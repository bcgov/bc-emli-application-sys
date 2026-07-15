# spec/controllers/api/contractor_employees_controller_spec.rb
require "rails_helper"

RSpec.describe Api::ContractorEmployeesController, type: :controller do
  # Create test users with different roles
  let(:admin_user) do
    User.create!(
      first_name: "Admin",
      last_name: "User",
      email: "admin@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:participant_user) do
    User.create!(
      first_name: "Participant",
      last_name: "User",
      email: "participant@example.com",
      password: "P@ssword1",
      role: :participant,
      confirmed_at: Time.current
    )
  end

  # Create contractor and employees
  let(:contractor) do
    Contractor.create!(
      business_name: "Test Contractor Ltd",
      contact: admin_user
    )
  end

  let(:active_employee) do
    user =
      User.create!(
        first_name: "Active",
        last_name: "Employee",
        email: "active@example.com",
        password: "P@ssword1",
        reviewed: true,
        discarded_at: nil,
        invitation_accepted_at: Time.current,
        confirmed_at: Time.current
      )
    ContractorEmployee.create!(contractor: contractor, employee: user)
    user
  end

  let(:deactivated_employee) do
    user =
      User.create!(
        first_name: "Deactivated",
        last_name: "Employee",
        email: "deactivated@example.com",
        password: "P@ssword1",
        reviewed: true,
        discarded_at: Time.current,
        invitation_accepted_at: Time.current,
        confirmed_at: Time.current
      )
    ContractorEmployee.create!(contractor: contractor, employee: user)
    user
  end

  let(:pending_employee) do
    user =
      User.create!(
        first_name: "Pending",
        last_name: "Employee",
        email: "pending@example.com",
        password: "P@ssword1",
        reviewed: false,
        discarded_at: nil,
        invitation_sent_at: Time.current,
        invitation_accepted_at: nil,
        invitation_token: "test_token_123",
        confirmed_at: Time.current
      )
    ContractorEmployee.create!(contractor: contractor, employee: user)
    user
  end

  let(:program) { create(:program) }

  # Helper method to parse JSON responses
  def json_response
    JSON.parse(response.body)
  end

  # Sign in as admin for most tests
  before { sign_in admin_user }

  describe "POST #deactivate" do
    context "when user is authorized (admin)" do
      it "deactivates an active employee" do
        post :deactivate,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }

        expect(response).to have_http_status(:success)
        expect(json_response["meta"]["message"]["type"]).to eq("success")
        expect(json_response["meta"]["message"]["message"]).to include(
          "deactivated"
        )
        expect(active_employee.reload.discarded_at).to be_present
      end

      it "logs an audit entry for the suspend (Auditable via User)" do
        since = Time.current
        post :deactivate,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }

        log =
          AuditLog
            .where(table_name: "users", action: "edit")
            .where("created_at >= ?", since)
            .detect do |l|
              l.data_after&.key?("discarded_at") &&
                l.data_after["discarded_at"].present?
            end
        expect(log).to be_present
        expect(log.user_id).to eq(admin_user.id)
        expect(log.record_id).to eq(active_employee.id)
      end

      it "is idempotent - can deactivate already deactivated employee" do
        post :deactivate,
             params: {
               contractor_id: contractor.id,
               id: deactivated_employee.id
             }

        expect(response).to have_http_status(:success)
        expect(deactivated_employee.reload.discarded_at).to be_present
      end
    end

    context "when user is unauthorized (participant)" do
      before { sign_in participant_user }

      it "returns 403 forbidden" do
        post :deactivate,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }

        expect(response).to have_http_status(:forbidden)
      end
    end

    context "when employee does not belong to contractor" do
      let(:other_contractor) do
        Contractor.create!(
          business_name: "Other Contractor Ltd",
          contact: admin_user
        )
      end

      let(:other_employee) do
        user =
          User.create!(
            first_name: "Other",
            last_name: "Employee",
            email: "other@example.com",
            password: "P@ssword1",
            confirmed_at: Time.current
          )
        ContractorEmployee.create!(contractor: other_contractor, employee: user)
        user
      end

      it "raises RecordNotFound" do
        expect {
          post :deactivate,
               params: {
                 contractor_id: contractor.id,
                 id: other_employee.id
               }
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end

  describe "POST #reactivate" do
    context "when user is authorized (admin)" do
      it "reactivates a deactivated employee" do
        post :reactivate,
             params: {
               contractor_id: contractor.id,
               id: deactivated_employee.id
             }

        expect(response).to have_http_status(:success)
        expect(json_response["meta"]["message"]["type"]).to eq("success")
        expect(deactivated_employee.reload.discarded_at).to be_nil
      end

      it "logs an audit entry for the unsuspend (Auditable via User)" do
        since = Time.current
        post :reactivate,
             params: {
               contractor_id: contractor.id,
               id: deactivated_employee.id
             }

        log =
          AuditLog
            .where(table_name: "users", action: "edit")
            .where("created_at >= ?", since)
            .detect do |l|
              l.data_after&.key?("discarded_at") &&
                l.data_after["discarded_at"].nil?
            end
        expect(log).to be_present
        expect(log.user_id).to eq(admin_user.id)
        expect(log.record_id).to eq(deactivated_employee.id)
      end

      it "is idempotent - can reactivate already active employee" do
        post :reactivate,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }

        expect(response).to have_http_status(:success)
        expect(active_employee.reload.discarded_at).to be_nil
      end
    end

    context "when user is unauthorized (participant)" do
      before { sign_in participant_user }

      it "returns 403 forbidden" do
        post :reactivate,
             params: {
               contractor_id: contractor.id,
               id: deactivated_employee.id
             }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "POST #invite" do
    context "when user is authorized (admin)" do
      it "resends the invite and reports it under reinvited when the email is already pending for this contractor" do
        pending_employee.update!(invitation_sent_at: 1.hour.ago)
        original_sent_at = pending_employee.invitation_sent_at

        post :invite,
             params: {
               contractor_id: contractor.id,
               program_id: program.id,
               users: [
                 {
                   email: pending_employee.email,
                   name: "Pending Employee",
                   role: "contractor"
                 }
               ]
             }

        expect(response).to have_http_status(:success)
        expect(
          json_response["data"]["reinvited"].map { |u| u["email"] }
        ).to include(pending_employee.email)
        expect(pending_employee.reload.invitation_sent_at).to be >
          original_sent_at
      end

      it "reports email_taken_active when the email already belongs to an active employee of this contractor" do
        post :invite,
             params: {
               contractor_id: contractor.id,
               program_id: program.id,
               users: [
                 {
                   email: active_employee.email,
                   name: "Active Employee",
                   role: "contractor"
                 }
               ]
             }

        expect(response).to have_http_status(:success)
        expect(
          json_response["data"]["email_taken_active"].map { |u| u["email"] }
        ).to include(active_employee.email)
      end
    end

    context "when user is unauthorized (participant)" do
      before { sign_in participant_user }

      it "returns 403 forbidden" do
        post :invite,
             params: {
               contractor_id: contractor.id,
               program_id: program.id,
               users: [
                 {
                   email: "new-employee@example.com",
                   name: "New Employee",
                   role: "contractor"
                 }
               ]
             }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "POST #reinvite" do
    context "when user is authorized (admin)" do
      it "re-invites a pending employee" do
        pending_employee.update!(invitation_sent_at: 1.hour.ago)
        original_sent_at = pending_employee.invitation_sent_at

        post :reinvite,
             params: {
               contractor_id: contractor.id,
               id: pending_employee.id,
               program_id: program.id
             }

        expect(response).to have_http_status(:success)
        expect(json_response["meta"]["message"]["type"]).to eq("success")
        expect(pending_employee.reload.invitation_sent_at).to be >
          original_sent_at
        expect(pending_employee.invitation_token).to be_present
      end

      it "raises RecordNotFound when employee does not exist" do
        expect {
          post :reinvite,
               params: {
                 contractor_id: contractor.id,
                 id: "00000000-0000-0000-0000-000000000000"
               }
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    context "when user is unauthorized (participant)" do
      before { sign_in participant_user }

      it "returns 403 forbidden" do
        post :reinvite,
             params: {
               contractor_id: contractor.id,
               id: pending_employee.id
             }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "POST #revoke_invite" do
    context "when user is authorized (admin)" do
      it "revokes a pending invitation" do
        expect(pending_employee.invitation_token).to be_present
        pending_employee_id = pending_employee.id

        post :revoke_invite,
             params: {
               contractor_id: contractor.id,
               id: pending_employee_id
             }

        expect(response).to have_http_status(:success)
        expect(json_response["meta"]["message"]["type"]).to eq("success")
        expect(
          ContractorEmployee.exists?(employee_id: pending_employee_id)
        ).to be false
        # pending_employee has no other associations, so revoking deletes the orphaned user entirely
        expect(User.exists?(pending_employee_id)).to be false
      end

      it "returns 422 when employee has no pending invite" do
        post :revoke_invite,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response["meta"]["message"]["type"]).to eq("error")
      end

      it "returns 422 when invitation already revoked" do
        pending_employee.update(invitation_token: nil)

        post :revoke_invite,
             params: {
               contractor_id: contractor.id,
               id: pending_employee.id
             }

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "when user is unauthorized (participant)" do
      before { sign_in participant_user }

      it "returns 403 forbidden" do
        post :revoke_invite,
             params: {
               contractor_id: contractor.id,
               id: pending_employee.id
             }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "State Transitions" do
    it "allows complete state transition cycle: active -> deactivated -> active" do
      employee = active_employee

      # Active -> Deactivated
      post :deactivate,
           params: {
             contractor_id: contractor.id,
             id: employee.id
           }
      expect(response).to have_http_status(:success)
      expect(employee.reload.discarded_at).to be_present

      # Deactivated -> Active
      post :reactivate,
           params: {
             contractor_id: contractor.id,
             id: employee.id
           }
      expect(response).to have_http_status(:success)
      expect(employee.reload.discarded_at).to be_nil
    end

    it "allows multiple reinvites for pending employees" do
      employee = pending_employee

      3.times do
        employee.update!(invitation_sent_at: 1.hour.ago)
        original_sent_at = employee.invitation_sent_at

        post :reinvite,
             params: {
               contractor_id: contractor.id,
               id: employee.id,
               program_id: program.id
             }
        expect(response).to have_http_status(:success)
        expect(employee.reload.invitation_sent_at).to be > original_sent_at
      end
    end

    it "removes the contractor employee association on revoke, so a later reinvite 404s" do
      employee_id = pending_employee.id

      # Revoke - destroys the ContractorEmployee association (and the orphaned user, here)
      post :revoke_invite,
           params: {
             contractor_id: contractor.id,
             id: employee_id
           }
      expect(response).to have_http_status(:success)

      # Reinvite - no ContractorEmployee association left for this contractor to look up
      expect {
        post :reinvite,
             params: {
               contractor_id: contractor.id,
               id: employee_id,
               program_id: program.id
             }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe "Authorization Levels" do
    context "admin (reviewer)" do
      before { sign_in admin_user }

      it "can deactivate employees" do
        post :deactivate,
             params: {
               contractor_id: contractor.id,
               id: active_employee.id
             }
        expect(response).to have_http_status(:success)
      end
    end
  end
end
