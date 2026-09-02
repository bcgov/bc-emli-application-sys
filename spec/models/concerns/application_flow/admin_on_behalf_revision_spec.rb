require "rails_helper"

# BCHEP-775. An admin editing a submission on the submitter's behalf was emailing the submitter
# "we need more information" for work the admin had just done themselves.
#
# The fix keeps the state change and suppresses only the notification. The state change is
# load-bearing: `submit` transitions only from new_draft or revisions_requested, so removing it
# broke the admin's own Review and submit with AASM::InvalidTransition (caught in review, see the
# "admin can still submit" examples below).
#
# Suppression keys off revision_requests.performed_by, so it covers both triggers - Save edits and
# the sidebar's finalize button - without the frontend having to say which pathway it is.
RSpec.describe "admin-on-behalf revision handling", type: :model do
  let(:program) { create(:program) }

  let(:audience_type) do
    AudienceType.find_or_create_by!(code: :external) do |at|
      at.name = "External"
      at.enabled = true
    end
  end

  # Give this spec its own requirement template. The :template_version factory falls back to
  # `LiveRequirementTemplate.first`, so on an empty database it would otherwise attach to whatever
  # another let block created - see the same trap fixed in support_requests_controller_spec.
  let(:requirement_template) { create(:live_requirement_template) }
  let(:template_version) do
    create(
      :template_version,
      requirement_template: requirement_template,
      status: "published",
      form_json: {
        "components" => []
      }
    )
  end

  let(:admin) { create(:user, role: :admin, confirmed_at: Time.current) }

  # can_submit? requires a signed section (application_flow/base.rb:66). Without it may_submit? is
  # false for reasons unrelated to state, which would mask the regression these specs guard against.
  let(:signed_submission_data) do
    { "data" => { "section-completion-key" => { "signed" => true } } }
  end

  let(:submission_version) do
    create(:submission_version, permit_application: permit_application)
  end

  before do
    allow(permit_application).to receive(
      :using_current_template_version
    ).and_return(true)
    allow(permit_application).to receive(:generate_and_upload_pdfs)
    allow(permit_application).to receive(:form_json).and_return(
      { "components" => [] }
    )
    # Re-apply after create: something in the create path drops it, and can_submit? needs it.
    # The existing invoice_external_contractor_spec does the same.
    permit_application.update!(submission_data: signed_submission_data)
  end

  # Both submission types that reach the admin review screen. Contractor onboarding already took the
  # silent path before BCHEP-775; these two did not.
  shared_examples "an admin-on-behalf edit" do
    it "resolves the open revision requests" do
      request =
        create(
          :revision_request,
          submission_version: submission_version,
          user: admin,
          performed_by: "staff"
        )

      expect {
        permit_application.apply_revision_requests_without_state_change!
      }.to change { request.reload.resolved_at }.from(nil)
    end

    it "leaves the status and revisions_requested_at untouched" do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: "staff"
      )

      expect {
        permit_application.apply_revision_requests_without_state_change!
      }.not_to change { permit_application.reload.status }

      expect(permit_application.revisions_requested_at).to be_nil
    end

    it "notifies nobody" do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: "staff"
      )

      expect {
        permit_application.apply_revision_requests_without_state_change!
      }.not_to have_enqueued_job
    end

    it "is a no-op when there is nothing outstanding to resolve" do
      submission_version # no revision requests on it

      expect(
        permit_application.apply_revision_requests_without_state_change!
      ).to be(false)
      expect(permit_application.reload.status).to eq(initial_status.to_s)
    end
  end

  # What the admin actually does: finalize with staff-pathway requests outstanding. The submitter
  # must not be told to act, but the application must still reach revisions_requested so the admin
  # can submit their own edits. Removing the state change breaks that - it is why the first attempt
  # at this fix was wrong.
  shared_examples "an admin finalizing their own edits" do
    let!(:staff_request) do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: "staff"
      )
    end

    it "notifies nobody" do
      expect {
        permit_application.finalize_revision_requests!
      }.not_to have_enqueued_job
    end

    it "still moves the application to revisions_requested" do
      expect { permit_application.finalize_revision_requests! }.to change {
        permit_application.reload.status
      }.to("revisions_requested")
    end

    it "leaves the admin able to submit their own edits" do
      permit_application.finalize_revision_requests!

      expect(permit_application.reload.may_submit?).to be(true)
    end
  end

  context "participant application" do
    let(:initial_status) { :resubmitted }
    let(:permit_application) do
      create(
        :permit_application,
        status: initial_status,
        submitter:
          create(:user, role: :participant, confirmed_at: Time.current),
        program: program,
        submission_type:
          SubmissionType.find_or_create_by!(code: :application) do |st|
            st.name = "Application"
            st.enabled = true
          end,
        user_group_type:
          UserGroupType.find_or_create_by!(code: :participant) do |ugt|
            ugt.name = "Participant"
            ugt.enabled = true
          end,
        audience_type: audience_type,
        template_version: template_version,
        submission_data: signed_submission_data
      )
    end

    it_behaves_like "an admin-on-behalf edit"
    it_behaves_like "an admin finalizing their own edits"

    it "still notifies when the submitter is genuinely being asked for something" do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: "applicant"
      )

      expect {
        permit_application.finalize_revision_requests!
      }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end

    it "notifies when the outstanding requests are mixed" do
      %w[staff applicant].each do |pathway|
        create(
          :revision_request,
          submission_version: submission_version,
          user: admin,
          performed_by: pathway
        )
      end

      expect {
        permit_application.finalize_revision_requests!
      }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end

    it "notifies when performed_by is missing, rather than assuming staff" do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: nil
      )

      expect {
        permit_application.finalize_revision_requests!
      }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end
  end

  context "contractor invoice" do
    let(:initial_status) { :newly_submitted }

    let(:contractor_contact) do
      create(:user, role: :contractor, confirmed_at: Time.current)
    end

    # invoice_submission_recipients (permit_application.rb:1349) resolves the contractor from the
    # submitter and returns nil,nil,nil when it cannot - which makes process_contractor_invoice_updated!
    # early-return before enqueuing anything. Without this Contractor record the "notifies nobody"
    # example passes even with the suppression removed, i.e. it tests nothing.
    let!(:contractor) do
      Contractor.create!(
        business_name: "Test Contracting Ltd",
        contact_id: contractor_contact.id
      )
    end

    let(:permit_application) do
      create(
        :permit_application,
        status: initial_status,
        submitter: contractor_contact,
        program: program,
        submission_type:
          SubmissionType.find_or_create_by!(code: :invoice) do |st|
            st.name = "Invoice"
            st.enabled = true
          end,
        user_group_type:
          UserGroupType.find_or_create_by!(code: :contractor) do |ugt|
            ugt.name = "Contractor"
            ugt.enabled = true
          end,
        audience_type: audience_type,
        template_version: template_version,
        submission_data: signed_submission_data
      )
    end

    it_behaves_like "an admin-on-behalf edit"
    it_behaves_like "an admin finalizing their own edits"

    # Counterpart to "notifies nobody": proves the invoice notification path is actually reachable
    # in this context, so the suppression example is not passing vacuously.
    it "still notifies the contractor when the request is genuinely for them" do
      create(
        :revision_request,
        submission_version: submission_version,
        user: admin,
        performed_by: "applicant"
      )

      expect {
        permit_application.finalize_revision_requests!
      }.to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end
  end
end
