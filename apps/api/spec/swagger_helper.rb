require "rails_helper"

# json-schema's MultiJSON path is incompatible with the json 3.x gem
# (JSON.parse dropped its second positional argument); parse with the json
# gem directly, as the json-schema deprecation notice recommends.
JSON::Validator.use_multi_json = false

RSpec.configure do |config|
  # Root for generated OpenAPI files; swagger/v1/openapi.yaml is committed
  # and consumed by packages/types (docs/architecture.md section 6).
  config.openapi_root = Rails.root.join("swagger").to_s

  config.openapi_specs = {
    "v1/openapi.yaml" => {
      openapi: "3.0.1",
      info: {
        title: "Curb Social Club API",
        version: "v1",
        description: "REST API for Curb Social Club. Public read endpoints work without a token."
      },
      paths: {},
      servers: [
        { url: "http://localhost:3000", description: "Development" },
        { url: "https://api.curbsocial.club", description: "Production (domain unconfirmed)" }
      ],
      components: {
        securitySchemes: {
          bearer: { type: :http, scheme: :bearer, description: "Opaque session token from POST /v1/auth/apple or /v1/auth/google" }
        },
        parameters: {
          deviceId: { name: "X-Device-Id", in: :header, required: false, schema: { type: :string, format: :uuid },
                      description: "Client-generated device UUID sent on every request from mobile and web" }
        },
        schemas: {
          Error: {
            type: :object,
            properties: {
              error: {
                type: :object,
                properties: { code: { type: :string }, message: { type: :string }, details: { type: :object, nullable: true } },
                required: %w[code message]
              }
            },
            required: %w[error]
          },
          Profile: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, handle: { type: :string }, display_name: { type: :string },
              bio: { type: :string, nullable: true }, avatar_url: { type: :string, nullable: true },
              home_label: { type: :string, nullable: true }, is_host: { type: :boolean },
              links: { type: :object, additionalProperties: { type: :string } },
              clubs: { type: :array, items: { type: :object, additionalProperties: true } },
              counts: { type: :object, additionalProperties: { type: :integer } },
              viewer: {
                type: :object,
                properties: { following: { type: :boolean }, blocked: { type: :boolean }, is_self: { type: :boolean }, reported: { type: :boolean } },
                required: %w[following blocked is_self reported]
              }
            },
            required: %w[id handle display_name is_host links clubs counts viewer]
          },
          User: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, email: { type: :string, nullable: true },
              role: { type: :string, enum: %w[member moderator admin] },
              status: { type: :string, enum: %w[active suspended deleted] },
              created_at: { type: :string, format: "date-time" },
              profile: { "$ref" => "#/components/schemas/Profile" },
              identities: {
                type: :array,
                items: {
                  type: :object,
                  properties: { provider: { type: :string, enum: %w[apple google] }, email: { type: :string, nullable: true } },
                  required: %w[provider email]
                }
              },
              notification_prefs: { type: :object, additionalProperties: true },
              unread_notifications_count: { type: :integer }
            },
            required: %w[id role status created_at profile identities notification_prefs]
          },
          Device: {
            type: :object,
            properties: {
              anonymous_id: { type: :string, format: :uuid }, platform: { type: :string, enum: %w[ios android web] },
              push_enabled: { type: :boolean }, push_token_present: { type: :boolean },
              app_version: { type: :string, nullable: true }, timezone: { type: :string, nullable: true },
              user_id: { type: :string, format: :uuid, nullable: true },
              home_location: { type: :object, nullable: true, properties: { lat: { type: :number }, lng: { type: :number } } },
              last_seen_at: { type: :string, format: "date-time", nullable: true }
            },
            required: %w[anonymous_id platform push_enabled push_token_present]
          }
        }
      }
    }
  }

  config.openapi_format = :yaml
end
