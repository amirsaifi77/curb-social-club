# No global policy: /v1 responses are JSON and keep the strict default.
# Admin::BaseController sets the /admin policy (docs/specs/admin.md R-7).
# Mission Control's importmap tags are inline scripts, so a per-request
# nonce is generated for script-src; admin.js itself loads by URL.
Rails.application.configure do
  config.content_security_policy_nonce_generator = ->(_request) { SecureRandom.base64(16) }
  config.content_security_policy_nonce_directives = %w[script-src]
end
