require "swagger_helper"

RSpec.describe "external_api/v1/applications",
               type: :request,
               openapi_spec: "external_api/v1/swagger.yaml" do
  let!(:external_api_key) { create(:external_api_key) }
  let!(:token) { external_api_key.token }
  let!(:Authorization) { "Bearer #{token}" }
  let!(:submitted_permit_applications) do
    create_list(
      :permit_application,
      3,
      :newly_submitted,
      jurisdiction: external_api_key.jurisdiction
    )
  end
  let!(:draft_permit_applications) do
    create_list(
      :permit_application,
      3,
      jurisdiction: external_api_key.jurisdiction
    )
  end
  let!(:unauthorized_jurisdiction_permit_applications) do
    [
      create(:permit_application, :newly_submitted),
      create(:permit_application),
      create(:permit_application, :newly_submitted)
    ]
  end

  before do
    Jurisdiction.reindex
    PermitApplication.reindex
  end

  path "/applications/search" do
    post "This endpoint retrieves a list of applications in a paginated format. It allows you to search through applications based on specified criteria, returning results in manageable pages." do
      tags "Applications"
      let(:constraints) { nil }
      consumes "application/json"
      produces "application/json"
      #parameter name: :constraints, in: :body, required: true

      # pagination as query params
      parameter name: :page,
                in: :query,
                schema: {
                  type: :integer,
                  default: 1,
                  minimum: 1
                },
                description: "Page number"

      parameter name: :per_page,
                in: :query,
                schema: {
                  type: :integer,
                  default: 25,
                  minimum: 1,
                  maximum: 100
                },
                description: "Page size"

      let(:page) { 1 }
      let(:per_page) { 25 }

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   type: :array,
                   description: "Submitted applications",
                   items: {
                     "$ref" => "#/components/schemas/Application"
                   }
                 },
                 meta: {
                   type: :object,
                   properties: {
                     total_pages: {
                       type: :integer,
                       description: "Total number of pages"
                     },
                     total_count: {
                       type: :integer,
                       description: "Total number of applications"
                     },
                     current_page: {
                       type: :integer,
                       description: "Current page number"
                     }
                   },
                   required: %w[total_pages total_count current_page]
                 }
               },
               required: %w[data meta]

        run_test! do |res|
          data = JSON.parse(res.body)

          expect(data.dig("data").length).to eq(
            submitted_permit_applications.length
          )
        end
      end

      response(
        429,
        "Rate limit exceeded. Note: The rate limit is 100 requests per minute per API key and 300 requests per IP in a 3 minute interval"
      ) do
        schema "$ref" => "#/components/schemas/ResponseError"
        around do |example|
          with_temporary_rate_limit(
            "external_api/ip",
            limit: 3,
            period: 1.minute
          ) { example.run }
        end
        before do
          5.times do
            get search_v1_permit_applications_path,
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/applications/{id}" do
    get(
      "This endpoint retrieves detailed information about a specific application using its unique identifier (ID). Please note that requests to this endpoint are subject to rate limiting to ensure optimal performance and fair usage."
    ) do
      parameter name: "id",
                in: :path,
                type: :string,
                description: "Submitted application id"
      tags "Applications"
      consumes "application/json"
      produces "application/json"

      let(:id) { submitted_permit_applications.first.id }

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   "$ref" => "#/components/schemas/Application"
                 }
               },
               required: %w[data]

        run_test! do |res|
          data = JSON.parse(res.body)

          expect(data.dig("data", "id")).to eq(
            submitted_permit_applications.first.id
          )
        end
      end

      response(403, "Accessing a application for unauthorized jurisdiction") do
        let(:id) { unauthorized_jurisdiction_permit_applications.first.id }
        run_test! { |response| expect(response.status).to eq(403) }
      end

      response(404, "Accessing a application which does not exist") do
        let(:id) { "does_not_exist" }
        run_test! { |response| expect(response.status).to eq(404) }
      end

      response(429, "Rate limit exceeded") do
        schema "$ref" => "#/components/schemas/ResponseError"
        around do |example|
          with_temporary_rate_limit(
            "external_api/ip",
            limit: 3,
            period: 1.minute
          ) { example.run }
        end
        before do
          5.times do
            get v1_permit_application_path(id),
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/applications/versions/{version_id}/integration_mapping" do
    get(
      "This endpoint retrieves the integration mapping for the system. It uses a unique ID associated with a specific version of the template."
    ) do
      parameter name: "version_id",
                in: :path,
                type: :string,
                description:
                  "This identifier corresponds to a specific version of the template, distinct from the application ID, which uniquely identifies an individuals application."

      tags "Applications"
      consumes "application/json"
      produces "application/json"

      let(:version_id) do
        submitted_permit_applications.first.template_version.id
      end
      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   "$ref" => "#/components/schemas/IntegrationMapping"
                 }
               },
               required: %w[data]

        run_test! do |res|
          data = JSON.parse(res.body)

          expect(data.dig("data", "id")).to eq(
            IntegrationMapping.find_by(
              jurisdiction: external_api_key.jurisdiction,
              template_version_id: version_id
            ).id
          )
        end
      end

      response(404, "Accessing a integration mapping which does not exist") do
        let(:version_id) { "does_not_exist" }
        run_test! { |response| expect(response.status).to eq(404) }
      end

      response(
        429,
        "Rate limit exceeded. Note: The rate limit is 100 requests per minute per API key and 300 requests per IP in a 3 minute interval"
      ) do
        schema "$ref" => "#/components/schemas/ResponseError"
        around do |example|
          with_temporary_rate_limit(
            "external_api/ip",
            limit: 3,
            period: 1.minute
          ) { example.run }
        end
        before do
          5.times do
            get "/external_api/v1/applications/versions/#{version_id}/integration_mapping",
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end
end
