# Active Record encryption keys for identities.provider_refresh_token
# (docs/data-model.md). Production must set the three variables; development
# and test fall back to fixed keys so the schema loads without secrets.
fallback = Rails.env.production? ? nil : "curb-development-only-not-a-secret"

Rails.application.configure do
  config.active_record.encryption.primary_key =
    ENV.fetch("ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY") { fallback }
  config.active_record.encryption.deterministic_key =
    ENV.fetch("ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY") { fallback }
  config.active_record.encryption.key_derivation_salt =
    ENV.fetch("ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT") { fallback }
end
