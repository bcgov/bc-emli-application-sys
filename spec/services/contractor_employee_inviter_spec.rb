require "rails_helper"

RSpec.describe ContractorEmployeeInviter do
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

  let(:contractor) do
    Contractor.create!(
      business_name: "Test Contractor Ltd",
      contact: admin_user
    )
  end

  let(:other_contractor) do
    Contractor.create!(
      business_name: "Other Contractor Ltd",
      contact: admin_user
    )
  end

  let(:program) { create(:program) }

  let(:inviter) do
    described_class.new(
      contractor: contractor,
      program: program,
      invited_by: admin_user
    )
  end

  def invite(email)
    inviter.invite_employees(
      [{ email: email, name: "Some Employee", role: "contractor" }]
    )
  end

  describe "#invite_employees" do
    it "invites a brand-new email" do
      results = invite("new-employee@example.com")

      expect(results[:invited].map(&:email)).to contain_exactly(
        "new-employee@example.com"
      )
    end

    it "resends the invite when the email is already pending for this contractor" do
      pending_employee =
        User.create!(
          first_name: "Pending",
          last_name: "Employee",
          email: "pending@example.com",
          password: "P@ssword1",
          invitation_sent_at: 1.day.ago,
          invitation_accepted_at: nil,
          invitation_token: "test_token_123",
          confirmed_at: Time.current
        )
      ContractorEmployee.create!(
        contractor: contractor,
        employee: pending_employee
      )
      original_sent_at = pending_employee.invitation_sent_at

      results = invite("pending@example.com")

      expect(results[:reinvited]).to eq([pending_employee])
      expect(results[:email_taken_pending]).to be_empty
      expect(pending_employee.reload.invitation_sent_at).to be >
        original_sent_at
    end

    it "reports email_taken_active when the email is already an active employee of this contractor" do
      active_employee =
        User.create!(
          first_name: "Active",
          last_name: "Employee",
          email: "active@example.com",
          password: "P@ssword1",
          invitation_accepted_at: Time.current,
          confirmed_at: Time.current
        )
      ContractorEmployee.create!(
        contractor: contractor,
        employee: active_employee
      )

      results = invite("active@example.com")

      expect(results[:email_taken_active]).to eq([active_employee])
      expect(results[:reinvited]).to be_empty
    end

    it "reports email_taken_deactivated when the email is a deactivated employee of this contractor" do
      deactivated_employee =
        User.create!(
          first_name: "Deactivated",
          last_name: "Employee",
          email: "deactivated@example.com",
          password: "P@ssword1",
          discarded_at: Time.current,
          invitation_accepted_at: Time.current,
          confirmed_at: Time.current
        )
      ContractorEmployee.create!(
        contractor: contractor,
        employee: deactivated_employee
      )

      results = invite("deactivated@example.com")

      expect(results[:email_taken_deactivated]).to eq([deactivated_employee])
    end

    it "reports email_taken_pending when the email is pending for a different contractor" do
      other_contractor_pending =
        User.create!(
          first_name: "Other",
          last_name: "Pending",
          email: "other-pending@example.com",
          password: "P@ssword1",
          invitation_sent_at: 1.day.ago,
          invitation_accepted_at: nil,
          invitation_token: "test_token_456",
          confirmed_at: Time.current
        )
      ContractorEmployee.create!(
        contractor: other_contractor,
        employee: other_contractor_pending
      )

      results = invite("other-pending@example.com")

      expect(results[:email_taken_pending]).to eq([other_contractor_pending])
      expect(results[:reinvited]).to be_empty
    end
  end
end
