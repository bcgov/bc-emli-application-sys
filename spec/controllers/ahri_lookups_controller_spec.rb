require "rails_helper"

RSpec.describe Api::AhriLookupsController, type: :controller do
  let(:user) { create(:user, :super_admin) }
  let(:wrapper) { instance_double(Wrappers::AhriSearch) }

  before do
    user.confirm
    sign_in user
    allow(Wrappers::AhriSearch).to receive(:new).and_return(wrapper)
  end

  describe "POST #create" do
    it "returns the requested AHRI field values" do
      allow(wrapper).to receive(:quick_search_by_reference_id).with(
        "212360177"
      ).and_return([{ "ProgramId" => 99 }])
      allow(wrapper).to receive(:search_detail_results).with(
        99,
        "212360177"
      ).and_return(
        [
          {
            "UniqueName" => "OutdoorUnitBrandName",
            "COLUMN_VALUE" => "Mitsubishi"
          },
          { "UniqueName" => "ModelNumber", "COLUMN_VALUE" => "MSZ-1234" },
          { "UniqueName" => "ReferenceId", "COLUMN_VALUE" => "212360177" }
        ]
      )

      post :create, params: { reference_id: "212360177" }, format: :json

      expect(response).to have_http_status(:ok)
      expect(json_response["reference_id"]).to eq("212360177")
      expect(json_response["program_id"]).to eq(99)
      expect(json_response["make"]).to eq("Mitsubishi")
      expect(json_response["model"]).to eq("MSZ-1234")
      expect(json_response["outdoor_unit_brand_name"]).to eq("Mitsubishi")
      expect(json_response["model_number"]).to eq("MSZ-1234")
    end

    it "returns bad request when reference_id is missing" do
      post :create, params: {}, format: :json

      expect(response).to have_http_status(:bad_request)
      expect(json_response["error"]).to eq("reference_id is required")
    end

    it "accepts wrapped ahri_lookup params" do
      allow(wrapper).to receive(:quick_search_by_reference_id).with(
        "212360177"
      ).and_return([{ "ProgramId" => 99 }])
      allow(wrapper).to receive(:search_detail_results).with(
        99,
        "212360177"
      ).and_return(
        [
          {
            "UniqueName" => "OutdoorUnitBrandName",
            "COLUMN_VALUE" => "Mitsubishi"
          },
          { "UniqueName" => "ModelNumber", "COLUMN_VALUE" => "MSZ-1234" }
        ]
      )

      post :create,
           params: {
             ahri_lookup: {
               reference_id: "212360177"
             }
           },
           format: :json

      expect(response).to have_http_status(:ok)
      expect(json_response["make"]).to eq("Mitsubishi")
      expect(json_response["model"]).to eq("MSZ-1234")
    end

    it "returns not found when AHRI does not return a matching program" do
      allow(wrapper).to receive(:quick_search_by_reference_id).with(
        "204444970"
      ).and_return(nil)

      post :create, params: { reference_id: "204444970" }, format: :json

      expect(response).to have_http_status(:not_found)
      expect(json_response["error"]).to eq(
        "No AHRI program found for reference_id"
      )
    end

    it "returns bad gateway when upstream call fails" do
      allow(wrapper).to receive(:quick_search_by_reference_id).and_raise(
        Faraday::ConnectionFailed.new("connection failed")
      )

      post :create, params: { reference_id: "212360177" }, format: :json

      expect(response).to have_http_status(:bad_gateway)
      expect(json_response["error"]).to include("connection failed")
    end

    it "returns bad gateway when upstream returns malformed JSON" do
      allow(wrapper).to receive(:quick_search_by_reference_id).and_raise(
        JSON::ParserError.new("unexpected end of input")
      )

      post :create, params: { reference_id: "204444970" }, format: :json

      expect(response).to have_http_status(:bad_gateway)
      expect(json_response["error"]).to include("unexpected end of input")
    end
  end
end
