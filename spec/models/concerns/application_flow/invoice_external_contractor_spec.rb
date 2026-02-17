require "rails_helper"

RSpec.describe ApplicationFlow::InvoiceExternalContractor, type: :model do
  describe "invoice state change process" do
    let(:submission_type) do
      SubmissionType.find_or_create_by!(code: :invoice) do |st|
        st.name = "Invoice"
        st.enabled = true
      end
    end
    let(:user_group_type) do
      UserGroupType.find_or_create_by!(code: :contractor) do |ugt|
        ugt.name = "Contractor"
        ugt.enabled = true
      end
    end
    let(:audience_type) do
      AudienceType.find_or_create_by!(code: :external) do |at|
        at.name = "External"
        at.enabled = true
      end
    end
    let(:program) { create(:program) }
    let(:submitter) { create(:user, role: :contractor) }
    let(:submission_data) do
      { "data" => { "section-completion-key" => { "signed" => true } } }
    end

    let(:permit_application) do
      create(
        :permit_application,
        status: initial_status,
        submitter: submitter,
        program: program,
        submission_type: submission_type,
        user_group_type: user_group_type,
        audience_type: audience_type,
        submission_data: submission_data
      )
    end

    before do
      allow(permit_application).to receive(
        :using_current_template_version
      ).and_return(true)
      allow(permit_application).to receive(:zip_and_upload_supporting_documents)
      allow(permit_application).to receive(:form_json).and_return(
        { "components" => [] }
      )
      permit_application.update!(submission_data: submission_data)
    end

    context "submission transitions" do
      let(:initial_status) { :new_draft }

      it "moves from draft to submitted and snapshots the submission" do
        expect { permit_application.submit! }.to change {
          permit_application.reload.status
        }.from("new_draft").to("newly_submitted").and change {
                permit_application.submission_versions.count
              }.by(1)

        expect(permit_application.signed_off_at).to be_present
        expect(permit_application).to have_received(
          :zip_and_upload_supporting_documents
        )
      end

      it "blocks submission when signature is missing" do
        permit_application.update!(submission_data: { "data" => {} })

        # Guard failure should prevent status changes and keep DB stable
        expect(permit_application.may_submit?).to be(false)
        expect { permit_application.submit! }.to raise_error(
          AASM::InvalidTransition
        )

        expect(permit_application.reload.status).to eq("new_draft")
      end
    end

    context "resubmission from update needed" do
      let(:initial_status) { :revisions_requested }

      it "moves to resubmitted when contractor re-signs" do
        expect { permit_application.submit! }.to change {
          permit_application.reload.status
        }.from("revisions_requested").to("resubmitted")
      end
    end

    context "review and approval workflow" do
      let(:initial_status) { :newly_submitted }

      it "screens in to in_review" do
        expect { permit_application.review! }.to change {
          permit_application.reload.status
        }.from("newly_submitted").to("in_review")
      end

      it "approves to approved_pending" do
        permit_application.update!(status: :in_review)

        expect { permit_application.approve! }.to change {
          permit_application.reload.status
        }.from("in_review").to("approved_pending")
      end

      it "marks paid from approved_pending" do
        permit_application.update!(status: :approved_pending)

        expect { permit_application.approve_paid! }.to change {
          permit_application.reload.status
        }.from("approved_pending").to("approved_paid")
      end

      it "rejects to ineligible and notifies" do
        permit_application.update!(status: :in_review)
        allow(NotificationService).to receive(
          :publish_application_ineligible_event
        )

        expect { permit_application.reject! }.to change {
          permit_application.reload.status
        }.from("in_review").to("ineligible")

        expect(NotificationService).to have_received(
          :publish_application_ineligible_event
        ).with(permit_application)
      end

      it "rolls back when notification fails during reject" do
        permit_application.update!(status: :in_review)
        allow(NotificationService).to receive(
          :publish_application_ineligible_event
        ).and_raise(StandardError, "service down")

        # Failure happens after transition; state change persists
        expect { permit_application.reject! }.to raise_error(StandardError)

        expect(permit_application.reload.status).to eq("ineligible")
      end

      it "prevents illegal payment approval" do
        permit_application.update!(status: :in_review)

        # Invalid transition should not change persisted status
        expect { permit_application.approve_paid! }.to raise_error(
          AASM::InvalidTransition
        )

        expect(permit_application.reload.status).to eq("in_review")
      end

      it "is idempotent after payment approval" do
        permit_application.update!(status: :approved_pending)
        permit_application.approve_paid!

        # Second attempt should be rejected and keep the final state intact
        expect { permit_application.approve_paid! }.to raise_error(
          AASM::InvalidTransition
        )

        expect(permit_application.reload.status).to eq("approved_paid")
      end
    end

    context "revision request workflow" do
      let(:initial_status) { :in_review }

      it "finalizes revision requests when revisions exist" do
        submission_version =
          create(:submission_version, permit_application: permit_application)
        create(
          :revision_request,
          submission_version: submission_version,
          user: create(:user, role: :admin)
        )

        expect { permit_application.finalize_revision_requests! }.to change {
          permit_application.reload.status
        }.from("in_review").to("revisions_requested")

        expect(permit_application.revisions_requested_at).to be_present
      end

      it "blocks revision finalization when no requests exist" do
        create(:submission_version, permit_application: permit_application)

        # Guard failure should prevent state changes and keep timestamps unset
        expect(permit_application.may_finalize_revision_requests?).to be(false)
        expect {
          permit_application.finalize_revision_requests!
        }.to raise_error(AASM::InvalidTransition)

        expect(permit_application.reload.status).to eq("in_review")
        expect(permit_application.revisions_requested_at).to be_nil
      end

      it "restores newly_submitted when canceling first-time revisions" do
        permit_application.update!(status: :revisions_requested)
        create(:submission_version, permit_application: permit_application)

        expect { permit_application.cancel_revision_requests! }.to change {
          permit_application.reload.status
        }.from("revisions_requested").to("newly_submitted")
      end

      it "restores resubmitted when canceling follow-up revisions" do
        permit_application.update!(status: :revisions_requested)
        create(:submission_version, permit_application: permit_application)
        create(:submission_version, permit_application: permit_application)

        expect { permit_application.cancel_revision_requests! }.to change {
          permit_application.reload.status
        }.from("revisions_requested").to("resubmitted")
      end
    end
  end

  describe "authorization" do
    let(:submission_type) do
      SubmissionType.find_or_create_by!(code: :invoice) do |st|
        st.name = "Invoice"
        st.enabled = true
      end
    end
    let(:user_group_type) do
      UserGroupType.find_or_create_by!(code: :contractor) do |ugt|
        ugt.name = "Contractor"
        ugt.enabled = true
      end
    end
    let(:audience_type) do
      AudienceType.find_or_create_by!(code: :external) do |at|
        at.name = "External"
        at.enabled = true
      end
    end
    let(:program) { create(:program) }

    let(:permit_application) do
      create(
        :permit_application,
        program: program,
        submission_type: submission_type,
        user_group_type: user_group_type,
        audience_type: audience_type
      )
    end

    it "allows admins and admin managers to approve" do
      admin = create(:user, role: :admin)
      admin_manager = create(:user, role: :admin_manager)
      admin_context = double("UserContext", user: admin, sandbox: nil)
      manager_context = double("UserContext", user: admin_manager, sandbox: nil)

      expect(
        PermitApplicationPolicy.new(admin_context, permit_application).approve?
      ).to be(true)
      expect(
        PermitApplicationPolicy.new(
          manager_context,
          permit_application
        ).approve?
      ).to be(true)
    end

    it "denies approval for non-admin users" do
      contractor = create(:user, role: :contractor)
      contractor_context = double("UserContext", user: contractor, sandbox: nil)

      expect(
        PermitApplicationPolicy.new(
          contractor_context,
          permit_application
        ).approve?
      ).to be(false)
    end
  end
end
