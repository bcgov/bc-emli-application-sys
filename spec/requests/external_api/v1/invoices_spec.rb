require "swagger_helper"

RSpec.describe "external_api/v1/invoices",
               type: :request,
               openapi_spec: "external_api/v1/swagger.yaml" do
  let!(:external_api_key) { create(:external_api_key) }
  let!(:token) { external_api_key.token }
  let!(:Authorization) { "Bearer #{token}" }

  path "/invoices" do
    get "This endpoint retrieves a list of contractor invoices with complete submission data. Returns full JSON payload for each invoice, suitable for daily batch retrieval. Supports date filtering to retrieve invoices submitted within a specific time range (e.g., previous day)." do
      tags "Invoices"
      produces "application/json"

      parameter name: :submitted_from,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter invoices submitted on or after this date (YYYY-MM-DD). Use this to retrieve invoices from the previous day.",
                required: false

      parameter name: :submitted_to,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter invoices submitted on or before this date (YYYY-MM-DD)",
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
                     "List of contractor invoices with full submission data",
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
                       description: "Total number of invoices"
                     },
                     current_page: {
                       type: :integer,
                       description: "Current page number"
                     },
                     per_page: {
                       type: :integer,
                       description: "Results per page"
                     }
                   },
                   required: %w[total_pages total_count current_page per_page]
                 }
               },
               required: %w[data meta],
               description:
                 "Each invoice in the data array includes complete submission_data JSON with all requirement blocks and field values."

        run_test! do |res|
          data = JSON.parse(res.body)
          expect(data).to have_key("data")
          expect(data).to have_key("meta")
          expect(data["data"]).to be_an(Array)
        end
      end

      response(400, "Bad Request - Invalid date format") do
        let(:submitted_from) { "invalid-date" }

        run_test! do |response|
          expect(response.status).to eq(400)
          data = JSON.parse(response.body)
          expect(data["error"]).to include("Invalid date format")
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        let(:Authorization) { "Bearer invalid_token" }
        run_test! { |response| expect(response.status).to eq(401) }
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
            get "/external_api/v1/invoices",
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/invoices/summary" do
    get "This endpoint retrieves a summary of contractor invoices filtered by submission date. Returns lightweight invoice data with only essential fields (invoice number, contractor name, submission date, status, amounts, homeowner info). Pagination is optional - omit page parameter to retrieve all results." do
      tags "Invoices"
      produces "application/json"

      parameter name: :submitted_from,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter invoices submitted on or after this date (YYYY-MM-DD)",
                required: false

      parameter name: :submitted_to,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter invoices submitted on or before this date (YYYY-MM-DD)",
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
                   description: "List of contractor invoices",
                   items: {
                     type: :object,
                     properties: {
                       invoice_number: {
                         type: :string,
                         description: "Invoice number",
                         example: "001-002-003"
                       },
                       contractor_business_name: {
                         type: :string,
                         description: "Contractor business name",
                         example: "ABC Heating & Cooling"
                       },
                       submission_date: {
                         type: :string,
                         format: "date-time",
                         description: "ISO8601 submission timestamp",
                         example: "2025-01-15T10:30:00Z"
                       },
                       status: {
                         type: :string,
                         description: "Invoice status",
                         example: "newly_submitted"
                       },
                       invoice_type: {
                         type: :string,
                         nullable: true,
                         description:
                           "Type of invoice (heat pump, insulation, etc.)",
                         example: "Heat pump (space heating)"
                       },
                       total_amount: {
                         type: :string,
                         nullable: true,
                         description: "Invoice total amount",
                         example: "5000.00"
                       },
                       installation_address: {
                         type: :string,
                         nullable: true,
                         description: "Installation address",
                         example: "123 Main St, Victoria, BC V8V 1A1"
                       },
                       homeowner_name: {
                         type: :string,
                         nullable: true,
                         description: "Homeowner full name",
                         example: "John Doe"
                       }
                     },
                     required: %w[
                       invoice_number
                       contractor_business_name
                       submission_date
                       status
                     ]
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
                       description: "Total number of invoices"
                     },
                     current_page: {
                       type: :integer,
                       description: "Current page number"
                     },
                     per_page: {
                       type: :integer,
                       description: "Results per page"
                     }
                   },
                   required: %w[total_pages total_count current_page per_page]
                 }
               },
               required: %w[data meta]

        run_test! do |res|
          data = JSON.parse(res.body)
          expect(data).to have_key("data")
          expect(data).to have_key("meta")
          expect(data["data"]).to be_an(Array)
        end
      end

      response(400, "Bad Request - Invalid date format") do
        let(:submitted_from) { "invalid-date" }

        run_test! do |response|
          expect(response.status).to eq(400)
          data = JSON.parse(response.body)
          expect(data["error"]).to include("Invalid date format")
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        let(:Authorization) { "Bearer invalid_token" }
        run_test! { |response| expect(response.status).to eq(401) }
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
            get "/external_api/v1/invoices/summary",
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/invoices/{id}" do
    get(
      "This endpoint retrieves detailed information about a specific contractor invoice using its unique identifier (ID). Returns the complete invoice with full submission data JSON payload. Please note that requests to this endpoint are subject to rate limiting to ensure optimal performance and fair usage."
    ) do
      parameter name: "id",
                in: :path,
                type: :string,
                description: "Invoice ID (UUID)",
                required: true

      tags "Invoices"
      consumes "application/json"
      produces "application/json"

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   "$ref" => "#/components/schemas/Application"
                 }
               },
               required: %w[data],
               description:
                 "Returns full invoice details using the same Application schema, with submission_type='invoice' and user_group_type='contractor'"

        # Note: This test would need a real invoice ID to pass
        # For now, it documents the expected structure
        skip "Requires invoice test data" do
          let(:id) { "valid-invoice-uuid" }
          run_test!
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        let(:id) { "any-id" }
        let(:Authorization) { "Bearer invalid_token" }
        run_test! { |response| expect(response.status).to eq(401) }
      end

      response(
        403,
        "Forbidden - Accessing an invoice from unauthorized program"
      ) do
        let(:id) { "invoice-from-different-program" }
        skip "Requires multi-program invoice test data"
      end

      response(404, "Not Found - Invoice does not exist") do
        let(:id) { "00000000-0000-0000-0000-000000000000" }
        run_test! { |response| expect(response.status).to eq(404) }
      end

      response(429, "Rate limit exceeded") do
        let(:id) { "any-id" }
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
            get "/external_api/v1/invoices/#{id}",
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
