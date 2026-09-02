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

    # BCHEP-775. An admin submitting on the applicant's behalf gets different copy - the applicant
    # is told an agent acted for them rather than thanked for work they did not do. The flag is an
    # explicit argument rather than an attr_accessor read off the record because deliver_later
    # reloads it, so an in-memory value would not survive the job boundary.
    context "when an admin submitted on the applicant's behalf" do
      let(:permit_application) do
        # The :resubmitted trait builds a revision_request whose user factory still sets the legacy
        # jurisdiction attribute and raises. The mailer only reads resubmitted?, so set the status
        # directly rather than depend on that trait.
        create(:permit_application, :newly_submitted, status: :resubmitted)
      end

      subject(:body) do
        mail =
          described_class.notify_submitter_application_submitted(
            permit_application,
            user,
            true
          )
        (mail.html_part || mail).body.to_s
      end

      it "says an agent acted on their behalf" do
        expect(body).to include(
          "An agent updated and resubmitted your application on your behalf"
        )
        expect(body).not_to include("Thank you for revising")
      end
    end

    # The other admin branch: a first submission rather than a resubmission, so the copy says
    # "submitted" not "resubmitted". Reached when a non-owner submits a draft - submit? allows that
    # for a user holding :all submission edit permissions (permit_application_policy.rb:183), and
    # submit moves new_draft to newly_submitted rather than resubmitted.
    context "when an admin made the first submission on the applicant's behalf" do
      let(:permit_application) { create(:permit_application, :newly_submitted) }

      subject(:body) do
        mail =
          described_class.notify_submitter_application_submitted(
            permit_application,
            user,
            true
          )
        (mail.html_part || mail).body.to_s
      end

      it "says an agent submitted, not resubmitted" do
        expect(body).to include(
          "An agent submitted your application on your behalf"
        )
        expect(body).not_to include("resubmitted")
        expect(body).not_to include("We've received your application")
      end
    end

    # Counterpart to the above: proves the wording is driven by the flag, not simply present in
    # every resubmission email.
    context "when the applicant resubmitted their own application" do
      let(:permit_application) do
        # The :resubmitted trait builds a revision_request whose user factory still sets the legacy
        # jurisdiction attribute and raises. The mailer only reads resubmitted?, so set the status
        # directly rather than depend on that trait.
        create(:permit_application, :newly_submitted, status: :resubmitted)
      end

      it "keeps the standard revision wording" do
        expect(body).to include("Thank you for revising")
        expect(body).not_to include("An agent")
      end
    end
  end
end
