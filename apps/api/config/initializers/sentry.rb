# Error tracking; a no-op unless SENTRY_DSN is set (docs/local-development.md).
if ENV["SENTRY_DSN"].present?
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.breadcrumbs_logger = [ :active_support_logger, :http_logger ]
    config.send_default_pii = false
    config.traces_sample_rate = 0.1
  end
end
