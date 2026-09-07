# Published meets on the spec fixture coordinates for the list, map, and
# feed request specs. Real rows, real PostGIS, never mocks.
module Meets
  # One published event at a GeoFixtures coordinate with one scheduled
  # occurrence at starts_at (default next Saturday 07:30 Pacific).
  def create_meet(fixture, title: nil, starts_at: GeoFixtures.next_saturday_0730, **event_attrs)
    venue = create(:venue, fixture: fixture, name: fixture.to_s.titleize)
    event = create(:event, :published, venue: venue, title: title || "#{fixture.to_s.titleize} Cars and Coffee",
                                       dtstart: starts_at, **event_attrs)
    create(:event_occurrence, event: event, starts_at: starts_at)
    event
  end

  # Many published once (or weekly) events at one point, each with one
  # scheduled occurrence, starts staggered by step, through insert_all.
  def bulk_meets(count, lat:, lng:, starts_at:, step: 1.minute, cadence: "once", title: "Bulk meet")
    user = create(:user)
    venue = create(:venue, location: Geo.point(lat, lng))
    now = Time.current
    prefix = SecureRandom.hex(3)
    events = Array.new(count) do |i|
      { host_type: "User", host_id: user.id, host_name: "Driver", created_by_id: user.id, venue_id: venue.id,
        title: "#{title} #{i}", slug: "bulk-#{prefix}-#{i}", cadence: cadence,
        rrule: cadence == "weekly" ? "FREQ=WEEKLY;BYDAY=SA" : nil, dtstart: starts_at + (i * step),
        duration_minutes: 120, timezone: "America/Los_Angeles", tags: [ "all" ], status: "published",
        visibility: "public", published_at: now, created_at: now, updated_at: now }
    end
    ids = Event.insert_all(events, returning: [ :id ]).rows.flatten
    occurrences = ids.each_with_index.map do |id, i|
      { event_id: id, starts_at: starts_at + (i * step), ends_at: starts_at + (i * step) + 120.minutes,
        location: venue.location, status: "scheduled", created_at: now, updated_at: now }
    end
    EventOccurrence.insert_all(occurrences)
    ids
  end

  def data_titles = json["data"].map { |row| row["title"] }

  # Bearer header for a signed-in request.
  def auth(user) = { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(user).token}" }
end

RSpec.configure do |config|
  config.include Meets, type: :request
  config.include Meets, type: :service
end
