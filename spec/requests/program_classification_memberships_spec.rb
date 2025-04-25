require "rails_helper"

RSpec.describe "ProgramClassificationMemberships API", type: :request do
  let(:program) { create(:program) }
  let(:user) { create(:user) }

  let!(:participant) do
    UserGroupType.find_or_create_by!(code: :participant) do |pc|
      pc.name = "Participant"
    end
  end

  let!(:contractor) do
    UserGroupType.find_or_create_by!(code: :contractor) do |pc|
      pc.name = "Contractor"
    end
  end

  let!(:onboarding) do
    SubmissionType.find_or_create_by!(code: :onboarding) do |pc|
      pc.name = "Onboarding"
    end
  end

  let!(:program_membership) do
    create(:program_membership, user: user, program: program)
  end

  describe "GET /participant_inbox_memberships" do
    before do
      create(
        :program_classification_membership,
        program_membership: program_membership,
        user_group_type: participant
      )
    end

    it "returns participant inbox memberships" do
      get participant_inbox_memberships_program_program_classification_memberships_path(
            program_id: program.id
          )

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to be_an(Array)
    end
  end

  describe "GET /contractor_inbox_memberships" do
    before do
      create(
        :program_classification_membership,
        program_membership: program_membership,
        user_group_type: contractor
      )
    end

    it "returns contractor inbox memberships" do
      get contractor_inbox_memberships_program_program_classification_memberships_path(
            program_id: program.id
          )

      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /contractor_onboarding_memberships" do
    before do
      create(
        :program_classification_membership,
        program_membership: program_membership,
        user_group_type: contractor,
        submission_type: onboarding
      )
    end

    it "returns contractor onboarding memberships" do
      get contractor_onboarding_memberships_program_program_classification_memberships_path(
            program_id: program.id
          )

      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /inbox_membership_exists" do
    before do
      create(
        :program_classification_membership,
        program_membership: program_membership,
        user_group_type: contractor,
        submission_type: onboarding
      )
    end

    it "returns true when membership exists" do
      get inbox_membership_exists_program_program_classification_memberships_path(
            program_id: program.id
          ),
          params: {
            user_id: user.id,
            user_group_type: "contractor",
            submission_type: "onboarding"
          }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["exists"]).to be true
    end
  end

  describe "POST /program_classification_memberships" do
    it "creates a new membership" do
      post program_program_classification_memberships_path(
             program_id: program.id
           ),
           params: {
             user_id: user.id,
             user_group_type: "contractor",
             submission_type: "onboarding"
           }

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      membership = ProgramClassificationMembership.find(json["id"])
      expect(membership.user.id).to eq(user.id)
    end
  end

  describe "DELETE /program_classification_memberships/:id" do
    let!(:membership) do
      create(
        :program_classification_membership,
        program_membership: program_membership,
        user_group_type: contractor,
        submission_type: onboarding
      )
    end

    it "removes the inbox membership" do
      expect {
        delete program_program_classification_membership_path(
                 program_id: program.id,
                 id: membership.id
               )
      }.to change(ProgramClassificationMembership, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
