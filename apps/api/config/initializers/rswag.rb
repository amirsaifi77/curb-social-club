# rswag-api serves the committed spec at /v1/openapi.yaml (docs/api.md).
Rswag::Api.configure do |c|
  c.openapi_root = Rails.root.join("swagger").to_s
end

# rswag-ui is a development-only gem; the engine mounts at /api-docs.
if defined?(Rswag::Ui)
  Rswag::Ui.configure do |c|
    c.openapi_endpoint "/v1/openapi.yaml", "Curb Social Club API v1"
  end
end
