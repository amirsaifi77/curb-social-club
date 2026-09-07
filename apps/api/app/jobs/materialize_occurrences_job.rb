# Nightly at 02:00 America/Los_Angeles (config/recurring.yml) and after
# every create or schedule change of a published event (Event callback):
# completes scheduled rows whose ends_at is past (R-9), then runs
# Recurrence::Materializer for every published, non-dormant event with a
# schedule, or for one event when given its id (R-10).
class MaterializeOccurrencesJob < ApplicationJob
  queue_as :default

  def perform(event_id = nil)
    if event_id
      event = Event.find_by(id: event_id)
      Recurrence::Materializer.call(event) if event
    else
      complete_past_occurrences
      Event.materializable.find_each { |event| Recurrence::Materializer.call(event) }
    end
  end

  private

  def complete_past_occurrences
    due = EventOccurrence.scheduled.where(ends_at: ...Time.current)
    event_ids = due.distinct.pluck(:event_id)
    due.update_all(status: "completed", updated_at: Time.current)
    Event.where(id: event_ids).find_each(&:recount_occurrences!)
  end
end
