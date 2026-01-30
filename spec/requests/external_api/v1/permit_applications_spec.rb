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

  path "/applications/summary" do
    get "This endpoint retrieves a summary of applications filtered by submission date. Returns lightweight application data with only essential fields (application id, submission date, heating systems, address, contact info). Pagination is optional - omit page parameter to retrieve all results." do
      tags "Applications"
      produces "application/json"

      parameter name: :submitted_from,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter applications submitted on or after this date (YYYY-MM-DD)",
                required: false

      parameter name: :submitted_to,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter applications submitted on or before this date (YYYY-MM-DD)",
                required: false

      parameter name: :page,
                in: :query,
                schema: {
                  type: :integer,
                  default: 1,
                  minimum: 1
                },
                description:
                  "Page number (optional). Omit to retrieve all results without pagination.",
                required: false

      parameter name: :per_page,
                in: :query,
                schema: {
                  type: :integer,
                  default: 25,
                  minimum: 1,
                  maximum: 100
                },
                description:
                  "Number of results per page (optional). Only used when page parameter is provided.",
                required: false

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   type: :array,
                   description:
                     "Application summaries. Returns all results when page parameter is omitted, or paginated results when page parameter is provided.",
                   items: {
                     type: :object,
                     description:
                       "Lightweight summary of application with essential fields only. Extracted from submission data.",
                     properties: {
                       app_id: {
                         type: :string,
                         description:
                           "The application number displayed to the user."
                       },
                       submission_date: {
                         type: :string,
                         format: "date-time",
                         description:
                           "ISO 8601 timestamp when the application was submitted.",
                         nullable: true
                       },
                       primary_heating_system: {
                         type: :string,
                         description:
                           "The primary heating system from the application submission data.",
                         nullable: true
                       },
                       secondary_heating_system: {
                         type: :string,
                         description:
                           "The secondary/backup heating system from the application submission data.",
                         nullable: true
                       },
                       address: {
                         type: :string,
                         description:
                           "The formatted address from the application submission data (unit number, street, city, postal code).",
                         nullable: true
                       },
                       first_name: {
                         type: :string,
                         description:
                           "The first name from the application submission data.",
                         nullable: true
                       },
                       last_name: {
                         type: :string,
                         description:
                           "The last name from the application submission data.",
                         nullable: true
                       },
                       phone_number: {
                         type: :string,
                         description:
                           "The phone number from the application submission data.",
                         nullable: true
                       },
                       email: {
                         type: :string,
                         description:
                           "The email address from the application submission data.",
                         nullable: true
                       }
                     },
                     required: %w[app_id]
                   }
                 },
                 meta: {
                   type: :object,
                   properties: {
                     total_pages: {
                       type: :integer,
                       description:
                         "Total number of pages (only present when page parameter is provided)"
                     },
                     total_count: {
                       type: :integer,
                       description:
                         "Total number of applications matching the filter criteria"
                     },
                     current_page: {
                       type: :integer,
                       description:
                         "Current page number (only present when page parameter is provided)"
                     }
                   },
                   required: %w[total_count]
                 }
               },
               required: %w[data meta]

        run_test! do |res|
          data = JSON.parse(res.body)
          expect(data.dig("data").length).to eq(
            submitted_permit_applications.length
          )
          expect(data.dig("meta", "total_count")).to eq(
            submitted_permit_applications.length
          )
        end
      end

      response(
        429,
        "Rate limit exceeded. Note: The rate limit is 100 requests per minute per API key and 300 requests per IP in a 3 minute interval"
      ) do
        schema "$ref" => "#/components/schemas/ResponseError"
        run_test!
      end
    end
  end
end
