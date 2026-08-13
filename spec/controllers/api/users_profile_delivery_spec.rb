require "rails_helper"

RSpec.describe Api::UsersController, type: :controller do
  let(:user) { create(:user, :submitter) }

  before { sign_in user }

  def json_response
    JSON.parse(response.body)
  end

  describe "PATCH #profile" do
    context "when the confirmation email cannot be delivered" do
      before do
        allow_any_instance_of(ActionMailer::MessageDelivery).to receive(
          :deliver_now
        ).and_raise(
          ChesEmailDelivery::DeliveryError.new(
            "CHES email delivery failed: 422 Invalid value `from`"
          )
        )
      end

      it "tells the user the email could not be sent" do
        patch :profile, params: { user: { email: "changed@example.com" } }

        expect(response).to have_http_status(:bad_request)
        expect(json_response["meta"]["message"]["title"]).to eq(
          "Email could not be sent"
        )
      end

      # Devise sends the confirmation from an after_commit hook, so the record is
      # already committed when delivery fails. The message says the changes were
      # saved - this makes sure that stays true.
      it "still persists the profile change" do
        patch :profile, params: { user: { email: "changed@example.com" } }

        expect(user.reload.unconfirmed_email).to eq("changed@example.com")
      end
    end
  end

  describe "POST #resend_confirmation" do
    context "when the confirmation email cannot be delivered" do
      before do
        allow_any_instance_of(ActionMailer::MessageDelivery).to receive(
          :deliver_now
        ).and_raise(
          ChesEmailDelivery::DeliveryError.new(
            "CHES email delivery failed: 422 Invalid value `from`"
          )
        )
      end

      # No rescue in the action itself - this exercises the catch-all
      # rescue_from in Api::ApplicationController.
      it "falls back to the generic delivery failure message" do
        post :resend_confirmation, params: { id: user.id }

        expect(response).to have_http_status(:bad_request)
        expect(json_response["meta"]["message"]["title"]).to eq(
          "Email could not be sent"
        )
        expect(json_response["meta"]["message"]["message"]).to eq(
          "The email could not be sent. Please try again, or contact support if the problem continues."
        )
      end
    end
  end
end
