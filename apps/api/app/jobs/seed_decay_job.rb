# Nightly at 02:45 America/Los_Angeles (config/recurring.yml): an unclaimed
# published event that has gone 90 days without a confirmation goes dormant
# (events spec R-26). A dormant event leaves lists, the map, feed, search,
# and the sitemap but keeps its page and its occurrences untouched (R-27);
# a claimed event never decays. Idempotent: a second run the same night
# finds nothing and logs a zero.
class SeedDecayJob < ApplicationJob
  queue_as :default

  def perform(now: Time.current)
    slugs = Event.decayable(now).order(:slug).pluck(:slug)
    Event.decayable(now).update_all(dormant_at: now, updated_at: now) if slugs.any?
    log(slugs)
    slugs
  end

  private

  def log(slugs)
    Rails.logger.info("SeedDecayJob: #{slugs.size} events went dormant#{slugs.any? ? ": #{slugs.join(', ')}" : ''}")
    return unless slugs.any? && defined?(Sentry) && Sentry.initialized?

    Sentry.add_breadcrumb(Sentry::Breadcrumb.new(category: "events", message: "#{slugs.size} events went dormant"))
  end
end
