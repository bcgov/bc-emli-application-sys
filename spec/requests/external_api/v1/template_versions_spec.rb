require "swagger_helper"

RSpec.describe "external_api/v1/versions",
               type: :request,
               openapi_spec: "external_api/v1/swagger.yaml" do
  let!(:external_api_key) { create(:external_api_key) }
  let!(:token) { external_api_key.token }
  let!(:Authorization) { "Bearer #{token}" }

  path "/versions/schema" do
    get "Returns the schema for all current published template versions scoped to the API key's program. One result per requirement template (latest published version only)." do
      tags "Template Versions"
      produces "application/json"

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   type: :array,
                   description: "List of published template version schemas",
                   items: {
                     type: :object,
                     properties: {
                       id: {
                         type: :string,
                         format: :uuid,
                         description: "Template version UUID"
                       },
                       requirement_template_id: {
                         type: :string,
                         format: :uuid,
                         description:
                           "Stable ID for the requirement template family. Use this to track which template a version belongs to."
                       },
                       nickname: {
                         type: :string,
                         description:
                           "Human-readable name of the template (e.g. \"Submit a heat pump invoice\")"
                       },
                       description: {
                         type: :string,
                         nullable: true,
                         description:
                           "Longer description of the template's purpose"
                       },
                       status: {
                         type: :string,
                         enum: %w[published],
                         description:
                           "Template version status (always published for this endpoint)"
                       },
                       version_date: {
                         type: :integer,
                         description:
                           "Version publish date as a Unix timestamp in milliseconds (BC time)"
                       },
                       requirement_blocks: {
                         type: :array,
                         description:
                           "Requirement blocks that make up the form",
                         items: {
                           type: :object,
                           properties: {
                             requirement_block_code: {
                               type: :string,
                               description:
                                 "Unique code identifying the requirement block"
                             },
                             name: {
                               type: :string,
                               description:
                                 "Display name of the requirement block"
                             },
                             requirements: {
                               type: :array,
                               description: "Form fields within this block",
                               items: {
                                 type: :object,
                                 properties: {
                                   requirement_code: {
                                     type: :string,
                                     description:
                                       "Unique code for this field, matches submission_data keys"
                                   },
                                   label: {
                                     type: :string,
                                     description: "Human-readable field label"
                                   },
                                   input_type: {
                                     type: :string,
                                     description:
                                       "Field input type (e.g. select, multi_option_select, radio, text, file, date, number)"
                                   },
                                   value_options: {
                                     type: :array,
                                     description:
                                       "Valid values for select/radio/multi_option_select fields. Absent for other input types.",
                                     items: {
                                       type: :object,
                                       properties: {
                                         label: {
                                           type: :string,
                                           description:
                                             "Display label for the option"
                                         },
                                         value: {
                                           type: :string,
                                           description:
                                             "Stored value for the option"
                                         }
                                       },
                                       required: %w[label value]
                                     }
                                   }
                                 },
                                 required: %w[requirement_code label input_type]
                               }
                             }
                           },
                           required: %w[
                             requirement_block_code
                             name
                             requirements
                           ]
                         }
                       }
                     },
                     required: %w[
                       id
                       requirement_template_id
                       nickname
                       status
                       version_date
                       requirement_blocks
                     ]
                   }
                 },
                 meta: {
                   type: :object,
                   properties: {
                     total_count: {
                       type: :integer,
                       description: "Total number of template versions returned"
                     }
                   },
                   required: %w[total_count]
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

      response(401, "Unauthorized - Invalid or missing API token") do
        schema type: :object,
               properties: {
                 data: {
                   type: :object
                 },
                 meta: {
                   type: :object,
                   properties: {
                     message: {
                       type: :object,
                       properties: {
                         title: {
                           type: :string
                         },
                         message: {
                           type: :string
                         },
                         type: {
                           type: :string
                         }
                       }
                     }
                   }
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
            get "/external_api/v1/versions/schema",
                headers: {
                  Authorization: "Bearer #{token}"
                }
          end
        end

        run_test! { |response| expect(response.status).to eq(429) }
      end
    end
  end

  path "/versions/{template_version_id}/schema" do
    get "Returns the schema for a specific published template version." do
      parameter name: "template_version_id",
                in: :path,
                type: :string,
                description: "Template version ID (UUID)",
                required: true

      tags "Template Versions"
      consumes "application/json"
      produces "application/json"

      response(200, "Successful") do
        schema type: :object,
               properties: {
                 data: {
                   type: :object,
                   description: "Template version schema",
                   properties: {
                     id: {
                       type: :string,
                       format: :uuid,
                       description: "Template version UUID"
                     },
                     requirement_template_id: {
                       type: :string,
                       format: :uuid,
                       description:
                         "Stable ID for the requirement template family. Use this to track which template a version belongs to."
                     },
                     nickname: {
                       type: :string,
                       description:
                         "Human-readable name of the template (e.g. \"Submit a heat pump invoice\")"
                     },
                     description: {
                       type: :string,
                       nullable: true,
                       description:
                         "Longer description of the template's purpose"
                     },
                     status: {
                       type: :string,
                       enum: %w[published],
                       description: "Template version status"
                     },
                     version_date: {
                       type: :integer,
                       description:
                         "Version publish date as a Unix timestamp in milliseconds (BC time)"
                     },
                     requirement_blocks: {
                       type: :array,
                       description: "Requirement blocks that make up the form",
                       items: {
                         type: :object,
                         properties: {
                           requirement_block_code: {
                             type: :string,
                             description:
                               "Unique code identifying the requirement block"
                           },
                           name: {
                             type: :string,
                             description:
                               "Display name of the requirement block"
                           },
                           requirements: {
                             type: :array,
                             description: "Form fields within this block",
                             items: {
                               type: :object,
                               properties: {
                                 requirement_code: {
                                   type: :string,
                                   description:
                                     "Unique code for this field, matches submission_data keys"
                                 },
                                 label: {
                                   type: :string,
                                   description: "Human-readable field label"
                                 },
                                 input_type: {
                                   type: :string,
                                   description:
                                     "Field input type (e.g. select, multi_option_select, radio, text, file, date, number)"
                                 },
                                 value_options: {
                                   type: :array,
                                   description:
                                     "Valid values for select/radio/multi_option_select fields. Absent for other input types.",
                                   items: {
                                     type: :object,
                                     properties: {
                                       label: {
                                         type: :string,
                                         description:
                                           "Display label for the option"
                                       },
                                       value: {
                                         type: :string,
                                         description:
                                           "Stored value for the option"
                                       }
                                     },
                                     required: %w[label value]
                                   }
                                 }
                               },
                               required: %w[requirement_code label input_type]
                             }
                           }
                         },
                         required: %w[requirement_block_code name requirements]
                       }
                     }
                   },
                   required: %w[
                     id
                     requirement_template_id
                     nickname
                     status
                     version_date
                     requirement_blocks
                   ]
                 }
               },
               required: %w[data]

        skip "Requires published template version test data" do
          let(:template_version_id) { "valid-template-version-uuid" }
          run_test!
        end
      end

      response(401, "Unauthorized - Invalid or missing API token") do
        let(:template_version_id) { "any-id" }
        let(:Authorization) { "Bearer invalid_token" }
        run_test! { |response| expect(response.status).to eq(401) }
      end

      response(
        403,
        "Forbidden - Template version does not belong to API key's program"
      ) do
        let(:template_version_id) { "template-version-from-different-program" }
        skip "Requires multi-program template version test data"
      end

      response(404, "Not Found - Template version does not exist") do
        let(:template_version_id) { "00000000-0000-0000-0000-000000000000" }
        run_test! { |response| expect(response.status).to eq(404) }
      end

      response(429, "Rate limit exceeded") do
        let(:template_version_id) { "any-id" }
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
            get "/external_api/v1/versions/#{template_version_id}/schema",
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
