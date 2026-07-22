require "rails_helper"

RSpec.describe ContractorStatusEvent, type: :model do
  let(:admin) do
    User.create!(
      first_name: "Admin",
      last_name: "User",
      email: "cse-admin@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:contractor) do
    Contractor.create!(business_name: "Status Event Contractor", contact: admin)
  end

  let(:onboard_application) do
    create(:permit_application, submitter: contractor)
  end

  let(:onboard) do
    ContractorOnboard.create!(
      contractor: contractor,
      onboard_application: onboard_application
    )
  end

  def build_event(attrs = {})
    ContractorStatusEvent.new(
      {
        contractor: contractor,
        contractor_onboard: onboard,
        event_type: "suspend",
        reason: "a reason",
        performed_by: admin
      }.merge(attrs)
    )
  end

  it "is valid for each allowed event_type" do
    ContractorStatusEvent::EVENT_TYPES.each do |type|
      expect(build_event(event_type: type)).to be_valid
    end
  end

  it "requires event_type" do
    event = build_event(event_type: nil)
    expect(event).not_to be_valid
    expect(event.errors[:event_type]).to be_present
  end

  it "rejects an unknown event_type" do
    event = build_event(event_type: "archive")
    expect(event).not_to be_valid
    expect(event.errors[:event_type]).to be_present
  end

  # Deliberately a faithful recorder: it never gates a status change, so it does
  # not require a reason even for suspend/remove (that rule lives on the frontend).
  it "allows a nil reason for every event_type" do
    expect(build_event(event_type: "suspend", reason: nil)).to be_valid
    expect(build_event(event_type: "unsuspend", reason: nil)).to be_valid
    expect(build_event(event_type: "remove", reason: nil)).to be_valid
  end

  it "allows a nil performed_by (actor optional)" do
    expect(build_event(performed_by: nil)).to be_valid
  end
end
