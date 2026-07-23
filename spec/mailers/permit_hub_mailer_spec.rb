require "rails_helper"

RSpec.describe PermitHubMailer, type: :mailer do
  describe "#notify_submitter_application_submitted" do
    let(:permit_application) { create(:permit_application, :newly_submitted) }
    let(:user) { permit_application.submitter }

    # The mailer skips unconfirmed users; the factory leaves users unconfirmed.
    before { user.update!(confirmed_at: Time.current) }

    subject(:body) do
      mail =
        described_class.notify_submitter_application_submitted(
          permit_application,
          user
        )
      (mail.html_part || mail).body.to_s
    end

    # A snippet unique to the DB-driven submission notice paragraph.
    let(:notice_snippet) { "high volume of applications" }

    context "when the submission notice is set" do
      before do
        SiteConfiguration.instance.update!(
          application_submission_notice:
            "Due to the high volume of applications, timelines are 45-60 days."
        )
      end

      it "renders the notice paragraph" do
        expect(body).to include(notice_snippet)
      end
    end

    context "when the submission notice is blank" do
      before do
        SiteConfiguration.instance.update!(application_submission_notice: "")
      end

      it "omits the paragraph and still sends the email" do
        expect(body).not_to include(notice_snippet)
        expect(body).to include("View Application")
      end
    end

    context "when the notice attribute is unavailable (stale schema cache)" do
      before do
        # A bare object does not respond to the attribute, so the mailer's
        # `try(:application_submission_notice)` guard returns nil rather than
        # raising. This mirrors the per-worker schema-cache race where the
        # newly added column is not yet visible to a running process.
        allow(SiteConfiguration).to receive(:instance).and_return(Object.new)
      end

      it "degrades gracefully without raising and still sends the email" do
        expect { body }.not_to raise_error
        expect(body).not_to include(notice_snippet)
        expect(body).to include("View Application")
      end
    end
  end
end
