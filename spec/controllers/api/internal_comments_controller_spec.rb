require "rails_helper"

RSpec.describe Api::InternalCommentsController, type: :controller do
  let!(:permit_application) { create(:permit_application) }
  # confirmed_at set so the require_confirmation before_action doesn't redirect (302)
  let!(:admin) { create(:user, role: :admin, confirmed_at: Time.current) }
  let!(:other_review_staff) do
    create(:user, role: :admin_manager, confirmed_at: Time.current)
  end
  let!(:participant) do
    create(:user, role: :participant, confirmed_at: Time.current)
  end

  describe "GET #index" do
    let!(:comment) do
      InternalComment.create!(
        permit_application: permit_application,
        user: admin,
        body: "a note"
      )
    end

    it "returns the thread for review staff" do
      sign_in admin
      get :index, params: { permit_application_id: permit_application.id }
      expect(response).to have_http_status(:success)
      expect(json_response["data"].map { |c| c["body"] }).to include("a note")
    end

    it "forbids a non-review-staff user" do
      sign_in participant
      get :index, params: { permit_application_id: permit_application.id }
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST #create" do
    it "creates a comment authored by the signed-in review-staff user" do
      sign_in admin
      expect {
        post :create,
             params: {
               permit_application_id: permit_application.id,
               body: "hello"
             }
      }.to change(InternalComment, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(json_response["data"]["user"]["id"]).to eq(admin.id)
    end

    it "forbids (and does not create) for a non-review-staff user" do
      sign_in participant
      expect {
        post :create,
             params: {
               permit_application_id: permit_application.id,
               body: "hello"
             }
      }.not_to change(InternalComment, :count)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE #destroy" do
    let!(:comment) do
      InternalComment.create!(
        permit_application: permit_application,
        user: admin,
        body: "a note"
      )
    end

    it "lets the author delete their own comment" do
      sign_in admin
      expect {
        delete :destroy,
               params: {
                 permit_application_id: permit_application.id,
                 id: comment.id
               }
      }.to change(InternalComment, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "forbids a different review-staff user from deleting someone else's comment" do
      sign_in other_review_staff
      expect {
        delete :destroy,
               params: {
                 permit_application_id: permit_application.id,
                 id: comment.id
               }
      }.not_to change(InternalComment, :count)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
