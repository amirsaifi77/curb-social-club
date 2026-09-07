# Sends one message to Sentry so a tier's DSN can be verified after a deploy
# (docs/local-development.md): bin/rails sentry:test_event
namespace :sentry do
  desc "Send a test event to Sentry (needs SENTRY_DSN)"
  task test_event: :environment do
    abort "SENTRY_DSN is not set; nothing to send." unless Sentry.initialized?

    event = Sentry.capture_message("Sentry test event from api", level: :info)
    Sentry.get_current_client&.flush
    puts "Sent event #{event&.event_id} to #{ENV.fetch('SENTRY_ENVIRONMENT', Rails.env)}."
  end
end
