require "rails_helper"

RSpec.describe Api::SupportRequestsController, type: :controller do
  # Regression cover for the request_supporting_files rescue. It used to be a single
  # `rescue ActiveRecord::RecordNotFound` around the whole action, so a bad parent id or a
  # bad audience_type_code both reported "No published Supporting Files request template
  # was found" - sending whoever debugged it looking for a template that was fine.
  let(:program) { create(:program) }

  let(:admin_user) do
    User.create!(
      first_name: "Support",
      last_name: "Admin",
      email: "support-req-admin@example.com",
      password: "P@ssword1",
      role: :admin,
      confirmed_at: Time.current
    )
  end

  let(:participant_user) do
    User.create!(
      first_name: "Support",
      last_name: "Participant",
      email: "support-req-participant@example.com",
      password: "P@ssword1",
      role: :participant,
      confirmed_at: Time.current
    )
  end

  # The controller renders the parent through the :extended blueprint, which pushes
  # form_json through FormJsonService - so the parent needs a usable form_json too.
  let(:parent_template_version) do
    create(
      :template_version,
      status: "published",
      form_json: {
        "components" => []
      }
    )
  end

  let(:parent_app) do
    create(
      :permit_application,
      submitter: participant_user,
      program: program,
      template_version: parent_template_version
    )
  end

  # The template the service resolves: program + participant/external/support_request.
  let(:support_request_template) do
    LiveRequirementTemplate.create!(
      program: program,
      user_group_type:
        UserGroupType.find_or_create_by!(code: :participant) do |u|
          u.name = "Participant"
        end,
      audience_type:
        AudienceType.find_or_create_by!(code: :external) do |a|
          a.name = "External"
        end,
      submission_type:
        SubmissionType.find_or_create_by!(code: :support_request) do |s|
          s.name = "Support Request"
        end,
      nickname: "Request Supporting Files"
    )
  end

  let!(:published_version) do
    create(
      :template_version,
      requirement_template: support_request_template,
      status: "published",
      # The :extended blueprint renders form_json through FormJsonService, which
      # indexes into ["components"] - the factory default of {} blows up there.
      form_json: {
        "components" => []
      }
    )
  end

  def json_response
    JSON.parse(response.body)
  end

  # render_error translates the i18n key into {title, message, type} via
  # ArbitraryMessageConstruct, so the key itself never reaches the response body.
  # Compare against the translation to pin the key without hardcoding the copy.
  def response_message
    json_response.dig("meta", "message", "message")
  end

  def copy_for(key)
    I18n.t("arbitrary_message_construct.application_controller.#{key}.message")
  end

  before do
    # Keep the specs off Elasticsearch and the notification pipeline.
    allow_any_instance_of(PermitApplication).to receive(:reindex)
    allow(NotificationService).to receive(
      :publish_supporting_files_requested_event
    )
    sign_in admin_user
  end

  describe "POST #request_supporting_files" do
    it "creates a support request for a valid parent application" do
      expect {
        post :request_supporting_files,
             params: {
               parent_application_id: parent_app.id,
               note: "invoice.pdf\nreceipt.pdf"
             }
      }.to change(SupportRequest, :count).by(1)

      expect(response).to have_http_status(:created)

      # Never SupportRequest.last here: UUID primary keys make .last non-deterministic,
      # and this database is shared with development, so it can return unrelated rows.
      support_request =
        SupportRequest.find_by!(parent_application_id: parent_app.id)
      expect(support_request.parent_application).to eq(parent_app)
      expect(support_request.requested_by).to eq(admin_user)
      expect(support_request.linked_application.template_version).to eq(
        published_version
      )
      expect(support_request.linked_application).to be_new_draft
    end

    it "serializes the linked application fields the supporting-files card reads" do
      # The card shows a Submitted date from signed_off_at, a reference number, and
      # picks its wording from the audience type. All three come from the blueprint's
      # minimal_with_documents view, and dropping any of them fails silently in the UI.
      post :request_supporting_files,
           params: {
             parent_application_id: parent_app.id,
             note: "invoice.pdf"
           }

      expect(response).to have_http_status(:created)

      linked = json_response["support_requests"].first["linked_application"]
      expect(linked).to include(
        "signed_off_at",
        "number",
        "audience_type",
        "status"
      )
    end

    it "reports a missing record, not a missing template, for an unknown parent application" do
      post :request_supporting_files,
           params: {
             parent_application_id: SecureRandom.uuid,
             note: "invoice.pdf"
           }

      expect(response).to have_http_status(:not_found)
      expect(response_message).to eq(
        copy_for("support_request_record_not_found")
      )
    end

    it "reports an unconfigured template for an unknown audience_type_code" do
      post :request_supporting_files,
           params: {
             parent_application_id: parent_app.id,
             note: "invoice.pdf",
             audience_type_code: "not_a_real_audience"
           }

      expect(response).to have_http_status(:not_found)
      expect(response_message).to eq(
        copy_for("support_request_template_missing")
      )
    end

    it "reports an unpublished template when the template exists but has no published version" do
      published_version.update!(status: :deprecated)

      post :request_supporting_files,
           params: {
             parent_application_id: parent_app.id,
             note: "invoice.pdf"
           }

      expect(response).to have_http_status(:not_found)
      expect(response_message).to eq(copy_for("no_published_template_version"))
    end
  end
end
