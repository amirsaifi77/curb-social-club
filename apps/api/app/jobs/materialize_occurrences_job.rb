# Nightly at 02:00 America/Los_Angeles (config/recurring.yml) and after
# every create or schedule change of a published event (Event callback):
# completes scheduled rows whose ends_at is past (R-9), then runs
# Recurrence::Materializer for every published, non-dormant event with a
# schedule, or for one event when given its id (R-10). In the nightly loop
# one event's failure is reported and skipped so the rest still get their
# horizon; there is no retry_on, so a single-event run that raises lands
# in Solid Queue's failed executions for Mission Control.
class MaterializeOccurrencesJob < ApplicationJob
  queue_as :default

  def perform(event_id = nil)
    if event_id
      event = Event.find_by(id: event_id)
      Recurrence::Materializer.call(event) if event
    else
      complete_past_occurrences
      Event.materializable.find_each { |event| materialize(event) }
    end
  end

  private

  def materialize(event)
    Recurrence::Materializer.call(event)
  rescue StandardError => error
    Rails.logger.error("MaterializeOccurrencesJob: event #{event.id} (#{event.slug}) failed: #{error.class}: #{error.message}")
    Sentry.capture_exception(error, extra: { event_id: event.id }) if defined?(Sentry) && Sentry.initialized?
  end

  def complete_past_occurrences
    due = EventOccurrence.scheduled.where(ends_at: ...Time.current)
    event_ids = due.distinct.pluck(:event_id)
    due.update_all(status: "completed", updated_at: Time.current)
    Event.where(id: event_ids).find_each(&:recount_occurrences!)
  end
end
