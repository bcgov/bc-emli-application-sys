require "swagger_helper"

RSpec.describe "external_api/v1/contractors",
               type: :request,
               openapi_spec: "external_api/v1/swagger.yaml" do
  let!(:external_api_key) { create(:external_api_key) }
  let!(:token) { external_api_key.token }
  let!(:Authorization) { "Bearer #{token}" }

  path "/contractors" do
    get "Retrieves all onboarded contractors for the API key's program. Supports optional pagination and date filtering on approval or last update date." do
      tags "Contractors"
      produces "application/json"

      parameter name: :approved_or_updated_from,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter by approval or last update date (on or after, YYYY-MM-DD).",
                required: false

      parameter name: :approved_or_updated_to,
                in: :query,
                schema: {
                  type: :string,
                  format: :date
                },
                description:
                  "Filter by approval or last update date (on or before, YYYY-MM-DD).",
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
                   description: "List of onboarded contractors",
                   items: {
                     type: :object,
                     properties: {
                       id: {
                         type: :string,
                         format: :uuid,
                         description: "Contractor UUID"
                       },
                       business_name: {
                         type: :string,
                         description: "Contractor business name"
                       },
                       number: {
                         type: :string,
                         nullable: true,
                         description: "Contractor number"
                       },
                       email: {
                         type: :string,
                         nullable: true,
                         description: "Contractor email"
                       },
                       phone_number: {
                         type: :string,
                         nullable: true,
                         description: "Business phone number"
                       },
                       cellphone_number: {
                         type: :string,
                         nullable: true,
                         description: "Business mobile phone number"
                       },
                       street_address: {
                         type: :string,
                         nullable: true,
                         description: "Street address"
                       },
                       city: {
                         type: :string,
                         nullable: true,
                         description: "City"
                       },
                       postal_code: {
                         type: :string,
                         nullable: true,
                         description: "Postal code"
                       },
                       website: {
                         type: :string,
                         nullable: true,
                         description: "Business website"
                       },
                       employees: {
                         type: :array,
                         description: "Contractor employees",
                         items: {
                           type: :object,
                           properties: {
                             id: {
                               type: :string,
                               format: :uuid
                             },
                             first_name: {
                               type: :string
                             },
                             last_name: {
                               type: :string
                             },
                             email: {
                               type: :string
                             }
                           }
                         }
                       },
                       created_at: {
                         type: :string,
                         format: "date-time",
                         description: "Record creation timestamp"
                       },
                       onboarded: {
                         type: :boolean,
                         description:
                           "Whether the contractor has completed onboarding"
                       },
                       contractor_info: {
                         type: :object,
                         nullable: true,
                         description: "Contractor profile details",
                         properties: {
                           id: {
                             type: :string,
                             format: :uuid
                           },
                           doing_business_as: {
                             type: :string,
                             nullable: true
                           },
                           license_issuer: {
                             type: :string,
                             nullable: true
                           },
                           license_number: {
                             type: :string,
                             nullable: true
                           },
                           incorporated_year: {
                             type: :integer,
                             nullable: true
                           },
                           number_of_employees: {
                             type: :integer,
                             nullable: true
                           },
                           gst_number: {
                             type: :string,
                             nullable: true
                           },
                           worksafebc_number: {
                             type: :string,
                             nullable: true
                           },
                           type_of_business: {
                             type: :array,
                             items: {
                               type: :string
                             },
                             nullable: true
                           },
                           primary_program_measure: {
                             type: :array,
                             items: {
                               type: :string
                             },
                             nullable: true
                           },
                           retrofit_enabling_measures: {
                             type: :array,
                             items: {
                               type: :string
                             },
                             nullable: true
                           },
                           service_languages: {
                             type: :array,
                             items: {
                               type: :string
                             },
                             nullable: true
                           },
                           updated_at: {
                             type: :string,
                             format: "date-time",
                             description: "Timestamp of approval or last update"
                           }
                         }
                       }
                     },
                     required: %w[id business_name onboarded created_at]
                   }
                 },
                 meta: {
                   type: :object,
                   properties: {
                     total_pages: {
                       type: :integer
                     },
                     total_count: {
                       type: :integer
                     },
                     current_page: {
                       type: :integer
                     },
                     per_page: {
                       type: :integer
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
        schema type: :object,
               properties: {
                 error: {
                   type: :string,
                   description: "Error message"
                 }
               },
               required: %w[error]

        let(:approved_or_updated_from) { "not-a-date" }

        run_test! do |response|
          expect(response.status).to eq(400)
          data = JSON.parse(response.body)
          expect(data["error"]).to include("Invalid date format")
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        schema type: :object,
               properties: {
                 data: {
                   type: :object
                 },
                 meta: {
                   type: :object
                 }
               }

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
            get "/external_api/v1/contractors",
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/contractors/{id}" do
    get "Retrieves profile data for a specific onboarded contractor by UUID." do
      parameter name: "id",
                in: :path,
                type: :string,
                description: "Contractor ID (UUID)",
                required: true

      tags "Contractors"
      consumes "application/json"
      produces "application/json"

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   type: :object,
                   description: "Contractor profile",
                   properties: {
                     id: {
                       type: :string,
                       format: :uuid,
                       description: "Contractor UUID"
                     },
                     business_name: {
                       type: :string,
                       description: "Contractor business name"
                     },
                     number: {
                       type: :string,
                       nullable: true,
                       description: "Contractor number"
                     },
                     email: {
                       type: :string,
                       nullable: true,
                       description: "Contractor email"
                     },
                     phone_number: {
                       type: :string,
                       nullable: true,
                       description: "Business phone number"
                     },
                     cellphone_number: {
                       type: :string,
                       nullable: true,
                       description: "Business mobile phone number"
                     },
                     street_address: {
                       type: :string,
                       nullable: true,
                       description: "Street address"
                     },
                     city: {
                       type: :string,
                       nullable: true,
                       description: "City"
                     },
                     postal_code: {
                       type: :string,
                       nullable: true,
                       description: "Postal code"
                     },
                     website: {
                       type: :string,
                       nullable: true,
                       description: "Business website"
                     },
                     created_at: {
                       type: :string,
                       format: "date-time",
                       description: "Record creation timestamp"
                     },
                     onboarded: {
                       type: :boolean,
                       description:
                         "Whether the contractor has completed onboarding"
                     },
                     employees: {
                       type: :array,
                       description: "Contractor employees",
                       items: {
                         type: :object,
                         properties: {
                           id: {
                             type: :string,
                             format: :uuid
                           },
                           first_name: {
                             type: :string
                           },
                           last_name: {
                             type: :string
                           },
                           email: {
                             type: :string
                           }
                         }
                       }
                     },
                     contractor_info: {
                       type: :object,
                       nullable: true,
                       description: "Contractor profile details",
                       properties: {
                         id: {
                           type: :string,
                           format: :uuid
                         },
                         doing_business_as: {
                           type: :string,
                           nullable: true
                         },
                         license_issuer: {
                           type: :string,
                           nullable: true
                         },
                         license_number: {
                           type: :string,
                           nullable: true
                         },
                         incorporated_year: {
                           type: :integer,
                           nullable: true
                         },
                         number_of_employees: {
                           type: :integer,
                           nullable: true
                         },
                         gst_number: {
                           type: :string,
                           nullable: true
                         },
                         worksafebc_number: {
                           type: :string,
                           nullable: true
                         },
                         type_of_business: {
                           type: :array,
                           items: {
                             type: :string
                           },
                           nullable: true
                         },
                         primary_program_measure: {
                           type: :array,
                           items: {
                             type: :string
                           },
                           nullable: true
                         },
                         retrofit_enabling_measures: {
                           type: :array,
                           items: {
                             type: :string
                           },
                           nullable: true
                         },
                         service_languages: {
                           type: :array,
                           items: {
                             type: :string
                           },
                           nullable: true
                         },
                         updated_at: {
                           type: :string,
                           format: "date-time",
                           description: "Timestamp of approval or last update"
                         }
                       }
                     }
                   },
                   required: %w[id business_name onboarded created_at]
                 }
               },
               required: %w[data]

        skip "Requires onboarded contractor test data" do
          let(:id) { "valid-contractor-uuid" }
          run_test!
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        let(:id) { "any-id" }
        let(:Authorization) { "Bearer invalid_token" }
        run_test! { |response| expect(response.status).to eq(401) }
      end

      response(403, "Forbidden - Contractor not in API key's program") do
        let(:id) { "contractor-from-different-program" }
        skip "Requires multi-program contractor test data"
      end

      response(404, "Not Found - Contractor does not exist") do
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
            get "/external_api/v1/contractors/#{id}",
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
