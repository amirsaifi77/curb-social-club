require "rails_helper"

RSpec.describe Geo::NearbyQuery, type: :service do
  let(:filters) { Geo::EventFilters.from_params({}) }
  let(:window) { Geo::Window.parse }
  let(:lido) { Geo::Origin.new(lat: 33.6172, lng: -117.9270) }

  it "clamps the radius at 160 km, defaults to 32, and to 80 with q" do
    expect(described_class.new(origin: lido, window: window, filters: filters).radius_km).to eq(32)
    expect(described_class.new(origin: lido, window: window, filters: filters, radius_km: 500).radius_km).to eq(160)
    searching = Geo::EventFilters.from_params({ q: "coffee" })
    expect(described_class.new(origin: lido, window: window, filters: searching).radius_km).to eq(80)
    expect(described_class.new(origin: lido, window: window, filters: searching, radius_km: 10).radius_km).to eq(10)
  end

  it "rejects sort=distance without near and keeps distance math in SQL (R-23)" do
    expect { Geo::ViewportQuery.new(bbox: Geo::Bbox.new(west: -118, south: 33, east: -117, north: 34), window: window, filters: filters, sort: "distance") }
      .to raise_error(Geo::ParamError, "Send near to sort by distance.")
    sql = described_class.new(origin: lido, window: window, filters: filters).inner_sql
    expect(sql).to include("ST_DWithin(event_occurrences.location", "ST_Distance(event_occurrences.location")
    expect(Dir.glob(Rails.root.join("app/**/*.rb")).map { |f| File.read(f) }.join).not_to match(/haversine|Math\.(sin|cos|atan2)/i)
  end

  it "uses the GiST index on event_occurrences for the R-16 query with 5,000 rows (Verification, Query plans)" do
    user = create(:user)
    now = Time.current
    venues = Array.new(100) do |i|
      # Spread across Southern California so a 32 km radius is selective.
      Venue.create!(name: "Venue #{i}", country: "US", created_by: user,
                    location: Geo.point(32.6 + (i % 10) * 0.3, -119.9 + (i / 10) * 0.5))
    end
    events = venues.map.with_index do |venue, i|
      { host_type: "User", host_id: user.id, host_name: "Driver", created_by_id: user.id, venue_id: venue.id, title: "Meet #{i}",
        slug: "explain-#{i}", cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA", dtstart: now, duration_minutes: 120,
        timezone: "America/Los_Angeles", tags: [ "all" ], status: "published", visibility: "public", published_at: now,
        created_at: now, updated_at: now }
    end
    event_ids = Event.insert_all(events, returning: [ :id ]).rows.flatten
    rows = event_ids.each_with_index.flat_map do |id, i|
      Array.new(50) do |j|
        starts = now + j.hours + (i * 7).minutes
        { event_id: id, starts_at: starts, ends_at: starts + 2.hours, location: venues[i].location, status: "scheduled",
          created_at: now, updated_at: now }
      end
    end
    EventOccurrence.insert_all(rows)
    expect(EventOccurrence.count).to eq(5_000)
    ActiveRecord::Base.connection.execute("ANALYZE event_occurrences; ANALYZE events; ANALYZE venues")

    plan = ActiveRecord::Base.connection.execute("EXPLAIN #{described_class.new(origin: lido, window: window, filters: filters).inner_sql}")
                             .map { |row| row["QUERY PLAN"] }.join("\n")
    expect(plan).to include("index_event_occurrences_on_location_and_starts_at")
    expect(plan).not_to include("Seq Scan on event_occurrences")
  end
end
