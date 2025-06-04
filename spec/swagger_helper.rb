# frozen_string_literal: true

require "rails_helper"

RSpec.configure do |config|
  # Specify a root folder where Swagger JSON files are generated
  # NOTE: If you're using the rswag-api to serve API descriptions, you'll need
  # to ensure that it's configured to serve Swagger from the same folder
  config.openapi_root = Rails.root.join("swagger").to_s

  servers = [
    { url: "/external_api/v1", description: "Current environment server" },
    {
      url: "{serverUrl}/external_api/v1",
      description: "Server url",
      variables: {
        serverUrl: {
          default: ""
        }
      }
    }
  ]

  # Define one or more Swagger documents and provide global metadata for each one
  # When you run the 'rswag:specs:swaggerize' rake task, the complete Swagger will
  # be generated at the provided relative path under openapi_root
  # By default, the operations defined in spec files are added to the first
  # document below. You can override this behavior by adding a openapi_spec tag to the
  # the root example_group in your specs, e.g. describe '...', openapi_spec: 'v2/swagger.json'
  config.openapi_specs = {
    "external_api/v1/swagger.yaml" => {
      openapi: "3.1.0",
      info: {
        title: "Integration API V1",
        version: "v1",
        description: <<-DESC
### API documentation overview
This document provides detailed information about the APIs available for external integrators to query and retrieve submitted and resubmitted permit applications.
It also includes specifications on webhook events that notify your systems in real-time.

### Data scope:
The permit applications returned by these APIs are limited to those within the jurisdiction associated with the API key used for the request. This
ensures that each integrator has access solely to relevant data.

### Integration steps:
To integrate with our APIs, please contact the Building Permit Hub team to enable your API access. Your local jurisdiction can then obtain the API key
and register your webhook URL in their configuration settings on the building permit hub. You can reach us directly at <digital.codes.permits@gov.bc.ca>
for further assistance.

### Authentication and authorization:
Access to these APIs is controlled via an API key, which must be included in the Authorization header as a Bearer token like so:
```
Authorization: Bearer {Your_API_Key_Here}
```
Please note that a unique API key is required for each jurisdiction you wish to access, enhancing security and data integrity.

### Rate limits:
To ensure fair usage, the API is rate-limited to 100 requests per minute per API key and 300 requests per IP in a 3 minute interval. Exceeding these
limits will result in a 429 response. If this occurs, we recommend spacing out your requests. Continued exceeding of rate limits
may necessitate further contact with the building permit hub team.

### Api base path:
The base path for all API endpoints is `/external_api/v1`.

### Server information for testing:
By default the requests from the documentation will be sent to the current environment servers. For testing purposes, you can specify a different server using the {serverUrl} variable.
During your integration testing phase, you have the flexibility to use custom URLs by configuring the serverUrl variable. This allows you to
tailor the API environment to better suit your development needs. Ensure that your custom URLs are configured correctly to avoid any connectivity or data access issues.

### Special considerations:
A returned permit application will have a status of either `newly_submitted` for permit applications submitted for the first time, or `resubmitted` for
permit applications that have been resubmitted due to revision requests. The `resubmitted_at` field will indicate the timestamp of the latest resubmission.
While there may be multiple resubmissions, the submission data payload returned will reflect the most recent submission data. 

For security purposes, any API response that includes a file URL will have a signed URL. These files will be available for download for a limited time (1 hour).
We recommend downloading the file immediately upon receiving the URL to avoid any issues. If necessary, you can always call the API again to retrieve a
new file URL.

### Visual aids and examples:
For a better understanding of how our APIs work, including webhook setups and request handling, please refer to the code examples included later
in this document.
        DESC
      },
      webhooks: {
        application_submitted: {
          tags: ["Webhooks"],
          post: {
            requestBody: {
              description:
                "### Request body:\nThis webhook sends information about a recently submitted 
        applications in a JSON format to the webhook URL specified by the external integrator.\nIt includes
        the application ID, which can be used to fetch the complete details of the application using the
        `GET/applications/{id}` endpoint.\n\n### Retries:\nIf the webhook does not receive a 200 status response
        from the external integrator, it will attempt to resend the notification up to 8 times using an exponential backoff
        strategy. This ensures multiple attempts to deliver the webhook in case of temporary issues on the receiving end.\n\n
### Expected responses:\nThe external integrator is expected to return a 200 status code to confirm successful receipt
        of the data. This acknowledgment indicates that the payload was received and processed without issues",
              content: {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/WebhookPayload"
                  }
                }
              }
            },
            responses: {
              "200" => {
                description:
                  "The external integrator should return a 200 status to indicate that the data was received successfully."
              }
            }
          }
        },
        application_resubmitted: {
          tags: ["Webhooks"],
          post: {
            requestBody: {
              description:
                "### Request body:\nThis webhook sends information about a recently resubmitted 
        application. A application can be resubmitted due to revision requests. After resubmission a payload is sent in JSON format to the webhook URL specified by the external integrator.\nIt includes
        the application ID, which can be used to fetch the complete details of the application using the
        `GET/applications/{id}` endpoint.\n\n### Retries:\nIf the webhook does not receive a 200 status response
        from the external integrator, it will attempt to resend the notification up to 8 times using an exponential backoff
        strategy. This ensures multiple attempts to deliver the webhook in case of temporary issues on the receiving end.\n\n
### Expected responses:\nThe external integrator is expected to return a 200 status code to confirm successful receipt
        of the data. This acknowledgment indicates that the payload was received and processed without issues",
              content: {
                "application/json" => {
                  schema: {
                    "$ref" => "#/components/schemas/WebhookPayload"
                  }
                }
              }
            },
            responses: {
              "200" => {
                description:
                  "The external integrator should return a 200 status to indicate that the data was received successfully."
              }
            }
          }
        }
      },
      paths: {
      },
      servers: servers,
      tags: [
        {
          name: "Applications",
          description: "Submitted applications (scoped to Program API key)"
        }
      ],
      components: {
        securitySchemes: {
          Bearer: {
            type: :http,
            scheme: :bearer,
            description: "Bearer token"
          }
        },
        schemas: {
          Application: {
            type: :object,
            properties: {
              id: {
                type: :string
              },
              full_address: {
                type: :string,
                description: "The full address of the application.",
                nullable: true
              },
              number: {
                type: :string,
                description: "The application number displayed to the user.",
                nullable: true
              },
              reference_number: {
                type: :string,
                description:
                  "The reference number of the application in external system.",
                nullable: true
              },
              submitted_at: {
                type: :number,
                format: :int64, # Indicates that it's an integer representing time in milliseconds since epoch
                description:
                  "Datetime in milliseconds since the epoch (Unix time). This is the timestamp when the application was first submitted."
              },
              resubmitted_at: {
                type: :number,
                format: :int64, # Indicates that it's an integer representing time in milliseconds since epoch
                description:
                  "Datetime in milliseconds since the epoch (Unix time). This is the timestamp when the application was last resubmitted due to a revision request. Note: there might be multiple resubmissions for an application, but this date is the last resubmission date.",
                nullable: true
              },
              user_group_type: {
                type: :string,
                enum: %w[participant contractor],
                description: "What user group the application belongs to"
              },
              submission_type: {
                type: :string,
                enum: %w[application onboarding support_request invoice],
                description: "The submission type of the application"
              },
              account_holder: {
                "$ref" => "#/components/schemas/AccountHolder"
              },
              application_version: {
                "$ref" => "#/components/schemas/ApplicationVersion"
              },
              submission_data: {
                "$ref" => "#/components/schemas/SubmissionData"
              }
            }
          },
          SubmissionData: {
            type: :object,
            description:
              "The submitted application data. This will reflect the most recent submitted data in case of resubmission. Note: the keys are the requirement block codes.",
            additionalProperties: {
              type: :object,
              properties: {
                id: {
                  type: :string,
                  description: "The ID of the requirement block."
                },
                requirement_block_code: {
                  type: :string,
                  description:
                    "The code of the requirement block. This is unique within the application."
                },
                name: {
                  type: :string,
                  description: "The name/label of the requirement block."
                },
                description: {
                  type: :string,
                  description: "The description of the requirement block.",
                  nullable: true
                },
                requirements: {
                  type: :array,
                  descriptions:
                    "The requirements for this requirement block and their submitted values.",
                  items: {
                    type: :object,
                    properties: {
                      id: {
                        type: :string,
                        description: "The ID of the requirement."
                      },
                      name: {
                        type: :string,
                        description: "The name/label of the requirement."
                      },
                      requirement_code: {
                        type: :string,
                        description:
                          "The requirement code for this requirement field. This is unique within the requirement block."
                      },
                      type: {
                        type: :string,
                        enum: Requirement.input_types.keys.map(&:to_s),
                        description: "The input type for this requirement."
                      },
                      value: {
                        description:
                          "The submitted value for this requirement.",
                        oneOf: [
                          { type: :string },
                          { type: :number },
                          { type: :boolean },
                          {
                            "$ref" =>
                              "#/components/schemas/ContactSubmissionValue"
                          },
                          {
                            "$ref" =>
                              "#/components/schemas/MultiOptionSubmissionValue"
                          },
                          {
                            "$ref" => "#/components/schemas/FileSubmissionValue"
                          }
                        ]
                      }
                    },
                    required: %w[id name requirement_code type value]
                  }
                }
              },
              required: %w[id requirement_block_code name requirements]
            }
          },
          Classification: {
            type: :object,
            description: "This object represents a classification.",
            properties: {
              id: {
                type: :string
              },
              name: {
                type: :string
              },
              description: {
                type: :string,
                nullable: true
              },
              code: {
                type: :string,
                description: "The code of the classification."
              }
            }
          },
          ApplicationVersion: {
            type: :object,
            description: "The object represents the application version.",
            properties: {
              id: {
                type: :string,
                description:
                  "The ID of the version. This can be used to retrieve the integration mapping of the Program for this version."
              },
              version_date: {
                type: :integer,
                format: :int64,
                description:
                  "The version date in milliseconds since the epoch (UNIX time). This is meant to be parsed as PST."
              },
              status: {
                type: :string,
                enum: %w[published deprecated],
                description: "The status of the version."
              }
            }
          },
          IntegrationMapping: {
            type: :object,
            description:
              "The integration mapping of the program for a specific application version.",
            properties: {
              id: {
                type: :string,
                description: "The ID of the integration mapping."
              },
              application_version: {
                "$ref" => "#/components/schemas/ApplicationVersion"
              },
              requirements_mapping: {
                "$ref" => "#/components/schemas/RequirementsMapping"
              }
            }
          },
          RequirementsMapping: {
            type: :object,
            description:
              "The mapping of the requirements between the system and program integration system. Note: the top level keys are the requirement block codes.",
            additionalProperties: {
              type: :object,
              description:
                "The requirement block mapping. This contains a requirements hash, where the keys are the requirement codes and the value is another hash containing the field mapping to the program system.",
              properties: {
                id: {
                  type: :string,
                  description: "The ID of the requirement block."
                },
                requirements: {
                  type: :object,
                  description:
                    "A hash of the requirement code to the program system field mapping.",
                  additionalProperties: {
                    type: :object,
                    properties: {
                      id: {
                        type: :string,
                        description: "The ID of the requirement."
                      },
                      local_system_mapping: {
                        type: :string,
                        description:
                          "The program integration system field mapping for this requirement. This should be the field name of the requirement in your system."
                      }
                    },
                    required: %w[id local_system_mapping]
                  }
                }
              },
              required: %w[id requirements]
            }
          },
          MultiOptionSubmissionValue: {
            type: :object,
            description:
              "The submission value for requirement input types, which are limited to a set of options. e.g. an option from a select drop down, or checkboxes.",
            additionalProperties: {
              type: :boolean,
              description:
                "The key is the option value, and the value is a boolean indicating if the option was selected."
            }
          },
          ContactSubmissionValue: {
            type: :array,
            description:
              "The contact submission value. It is an array of contact objects.",
            items: {
              type: :object,
              properties: {
                first_name: {
                  type: :string,
                  description: "The first name of the contact."
                },
                last_name: {
                  type: :string,
                  description: "The last name of the contact."
                },
                email: {
                  type: :string,
                  description: "The email of the contact."
                },
                phone: {
                  type: :string,
                  description: "The phone number of the contact."
                },
                address: {
                  type: :string,
                  description: "The address of the contact."
                },
                title: {
                  type: :string,
                  description: "The title of the contact."
                },
                organization: {
                  type: :string,
                  description: "The organization of the contact."
                }
              }
            }
          },
          FileSubmissionValue: {
            description:
              "The file submission value. It is an array of file objects. Note: the urls are signed and will expire after 1 hour.",
            type: :array,
            items: {
              "$ref" => "#/components/schemas/File"
            }
          },
          File: {
            type: :object,
            properties: {
              id: {
                type: :string,
                description: "The ID of the file."
              },
              name: {
                type: :string,
                description: "The name of the file."
              },
              size: {
                type: :integer,
                description: "The size of the file in bytes."
              },
              type: {
                type: :string,
                description:
                  "The type of the file. e.g. image/png, application/pdf, etc."
              },
              url: {
                type: :string,
                format: "url",
                description: "The signed URL to download the file."
              }
            }
          },
          AccountHolder: {
            type: :object,
            description: "The account holder of the application.",
            properties: {
              id: {
                type: :string,
                description: "The ID of the account holder."
              },
              email: {
                type: :string,
                description: "The email of the account holder."
              },
              first_name: {
                type: :string,
                description: "The first name of the account holder."
              },
              last_name: {
                type: :string,
                description: "The last name of the account holder."
              }
            }
          },
          ResponseError: {
            type: :object,
            properties: {
              data: {
                type: :object,
                properties: {
                }
              },
              meta: {
                type: :object,
                properties: {
                  message: {
                    type: :string,
                    description: "The error message."
                  },
                  type: {
                    type: :string,
                    enum: %w[error]
                  }
                }
              }
            }
          },
          WebhookPayload: {
            type: :object,
            properties: {
              event: {
                type: :string,
                enum: %w[permit_submitted permit_resubmitted],
                description: "The event type."
              },
              payload: {
                type: :object,
                properties: {
                  permit_id: {
                    type: :string,
                    description: "The application ID."
                  },
                  submitted_at: {
                    type: :integer,
                    format: "int64",
                    description:
                      "The timestamp of when the application was submitted or resubmitted. This is in milliseconds since the epoch (UNIX time)."
                  }
                }
              }
            }
          }
        }
      },
      formats: %w[json yaml],
      security: [{ Bearer: [] }]
    }
  }

  # Specify the format of the output Swagger file when running 'rswag:specs:swaggerize'.
  # The openapi_specs configuration option has the filename including format in
  # the key, this may want to be changed to avoid putting yaml in json files.
  # Defaults to json. Accepts ':json' and ':yaml'.
  config.openapi_format = :yaml
end
