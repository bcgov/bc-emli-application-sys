require "rails_helper"

RSpec.describe Api::ProgramsController, type: :controller do
  let(:admin) { create(:user, :admin) }
  let(:program) { create(:program) }
  let(:submitter) { create(:user, role: "participant") }

  before { sign_in admin }

  describe "POST #search_permit_applications" do
    let(:base_params) do
      {
        id: program.id,
        query: "",
        page: 1,
        per_page: 20,
        filters: {
          submission_type_id: [],
          audience_type_id: [],
          status: []
        }
      }
    end

    context "with resubmitted applications" do
      let!(:resubmitted_apps) do
        create_list(
          :permit_application,
          3,
          :resubmitted,
          submitter: submitter,
          program: program
        )
      end
      let!(:submitted_apps) do
        create_list(
          :permit_application,
          2,
          :newly_submitted,
          submitter: submitter,
          program: program
        )
      end

      before do
        PermitApplication.reindex
        allow(controller).to receive(:current_sandbox).and_return(nil)
      end

      it "returns only resubmitted applications when filtering by status" do
        post :search_permit_applications,
             params:
               base_params.deep_merge(filters: { status: ["resubmitted"] })

        result_ids = json_response["data"].map { |r| r["id"] }
        expect(result_ids).to match_array(resubmitted_apps.map(&:id))
      end

      it "returns all program applications without a status filter" do
        post :search_permit_applications, params: base_params

        result_ids = json_response["data"].map { |r| r["id"] }
        expect(result_ids).to match_array(
          (resubmitted_apps + submitted_apps).map(&:id)
        )
      end

      it "keeps query count bounded regardless of result count (no N+1)" do
        queries_3 =
          count_queries do
            post :search_permit_applications,
                 params:
                   base_params.deep_merge(filters: { status: ["resubmitted"] })
          end

        extra_apps =
          create_list(
            :permit_application,
            3,
            :resubmitted,
            submitter: submitter,
            program: program
          )
        PermitApplication.reindex

        queries_6 =
          count_queries do
            post :search_permit_applications,
                 params:
                   base_params.deep_merge(
                     per_page: 6,
                     filters: {
                       status: ["resubmitted"]
                     }
                   )
          end

        expect(queries_6).to be_within(2).of(queries_3),
        "Query count scaled with result size (#{queries_3} for 3 results, #{queries_6} for 6) — N+1 present"
      end
    end
  end
end
