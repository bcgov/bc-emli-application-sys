require "rails_helper"

RSpec.describe CustomDeviseMailer do
  let(:user) { create(:user) }

  # Devise 5's headers_for stopped supplying :from when the mailer declares
  # `default from:`. devise_mail still forwarded that now-absent key, so the
  # message went out with a blank From and CHES rejected it with a 422.
  # These guard the header rather than the mechanism, so they keep working
  # whichever way Devise chooses to supply it.
  describe "the From header" do
    # mail[:from].to_s is the exact string ChesEmailDelivery#deliver! sends to
    # CHES, so asserting on it tests the value that actually gets rejected.
    it "is populated on confirmation instructions" do
      mail = described_class.confirmation_instructions(user, "tok")

      expect(mail[:from].to_s).to be_present
      expect(mail.from.first).to eq(described_class.default[:from])
    end

    it "is populated on invitation instructions" do
      mail = described_class.invitation_instructions(user, "tok")

      expect(mail[:from].to_s).to be_present
    end
  end
end
