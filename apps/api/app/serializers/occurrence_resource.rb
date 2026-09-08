# Occurrence (docs/api.md): one date of an event, with the event summary
# so a client can render the row on its own. going_preview and viewer wait
# for RSVPs and check-ins (Phase 2), so they are empty and false here.
class OccurrenceResource
  include Alba::Resource

  attributes :id, :status, :override_note, :going_count, :interested_count, :check_in_count

  attribute(:starts_at) { |occurrence| occurrence.starts_at.utc.iso8601 }
  attribute(:ends_at) { |occurrence| occurrence.ends_at.utc.iso8601 }
  attribute(:timezone) { |occurrence| occurrence.event.timezone }
  # web.md R-8: W04 is self-canonical only when a host has edited this
  # date, so the client has to be able to tell an edited date from one
  # the materializer wrote.
  attribute(:overridden_at) { |occurrence| occurrence.overridden_at&.utc&.iso8601 }
  # The caller passes one hit for the event so a page of dates does not
  # rebuild (and re-query) the same summary per row.
  attribute :event do |occurrence|
    EventSummaryResource.new(params[:event_hit] || Geo::EventHit.for(occurrence.event)).to_h
  end
  attribute(:going_preview) { [] }
  attribute(:viewer) { { rsvp: nil, checked_in: false } }
end
