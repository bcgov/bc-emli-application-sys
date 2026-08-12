require "rails_helper"

RSpec.describe ChesEmailDelivery do
  # Built with allocate so #initialize does not authenticate against CHES.
  subject(:delivery) { described_class.allocate.tap { |d| d.client = client } }

  let(:client) { instance_double(Faraday::Connection) }
  let(:user) { create(:user) }
  let(:mail) { CustomDeviseMailer.confirmation_instructions(user, "tok") }

  before do
    allow(delivery).to receive(
      :ensure_ches_token_is_valid_and_health_check_passes
    )
    allow(client).to receive(:post).and_return(response)
  end

  context "when CHES accepts the message" do
    let(:response) do
      instance_double(
        Faraday::Response,
        success?: true,
        body: { messages: [{ msgId: "abc-123" }] }.to_json
      )
    end

    it "returns the message id" do
      expect(delivery.deliver!(mail)).to eq("abc-123")
    end
  end

  context "when CHES rejects the message" do
    let(:response) do
      instance_double(
        Faraday::Response,
        success?: false,
        status: 422,
        body: '{"detail":"Invalid value `from`"}'
      )
    end

    # This used to be logged and swallowed, which hid every Devise email
    # failing for three weeks after the Devise 5 upgrade.
    it "raises DeliveryError rather than swallowing the failure" do
      expect { delivery.deliver!(mail) }.to raise_error(
        ChesEmailDelivery::DeliveryError,
        /422/
      )
    end
  end
end
