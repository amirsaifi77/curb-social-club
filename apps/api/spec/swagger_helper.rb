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
      ]
    }
  }

  config.openapi_format = :yaml
end
