require "rails_helper"

RSpec.describe Feed::Builder, type: :service do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }
  let(:origin) { Geo::Origin.new(lat: 33.6172, lng: -117.9270) }

  def build(now:) = described_class.call(origin: origin, radius_km: 32, now: now)
  def kinds(sections) = sections.map(&:kind)

  def meet(starts_at, title)
    create_meet(:corona_del_mar, starts_at: starts_at, title: title)
  end

  describe "window boundaries (R-6)" do
    it "runs this_weekend to the coming Sunday, whatever day it is asked on" do
      travel_to zone.parse("2026-10-21 10:00") do
        meet(zone.parse("2026-10-25 23:30"), "Late Sunday")
        meet(zone.parse("2026-10-26 00:30"), "Early Monday")
        meet(zone.parse("2026-11-02 09:00"), "The week after")

        sections = build(now: Time.current).index_by(&:kind)
        expect(sections[:this_weekend].items.map { |row| row["title"] }).to eq([ "Late Sunday" ])
        expect(sections[:next_week].items.map { |row| row["title"] }).to eq([ "Early Monday" ])
        expect(sections[:later].items.map { |row| row["title"] }).to eq([ "The week after" ])
      end
    end

    it "treats a Sunday as its own weekend end, so a Sunday evening meet is still this weekend" do
      travel_to zone.parse("2026-10-25 09:00") do
        meet(zone.parse("2026-10-25 18:00"), "Tonight")
        meet(zone.parse("2026-10-31 09:00"), "Next Saturday")

        sections = build(now: Time.current).index_by(&:kind)
        expect(sections[:this_weekend].items.map { |row| row["title"] }).to eq([ "Tonight" ])
        expect(sections[:next_week].items.map { |row| row["title"] }).to eq([ "Next Saturday" ])
      end
    end

    it "measures the day in the venue's timezone, not the server's" do
      travel_to zone.parse("2026-10-21 10:00") do
        east = create(:venue, location: Geo.point(33.6180, -117.9270), timezone: "America/New_York")
        # 02:30 UTC Monday is Sunday 22:30 in New York, so it is this weekend there.
        event = create(:event, :published, venue: east, title: "Sunday in New York",
                                           timezone: "America/New_York", dtstart: Time.utc(2026, 10, 26, 2, 30))
        create(:event_occurrence, event: event, starts_at: event.dtstart)

        sections = build(now: Time.current).index_by(&:kind)
        expect(sections[:this_weekend].items.map { |row| row["title"] }).to eq([ "Sunday in New York" ])
      end
    end
  end

  describe "section assembly (R-5)" do
    it "omits empty sections and keeps the display order" do
      travel_to zone.parse("2026-10-21 10:00") do
        expect(build(now: Time.current)).to eq([])

        meet(zone.parse("2026-11-25 18:00"), "Five weeks out")
        expect(kinds(build(now: Time.current))).to eq([ :later ])

        create(:club, name: "Nearby Club", home_location: Geo.point(33.6352, -117.9270))
        meet(zone.parse("2026-10-24 07:30"), "Saturday")
        expect(kinds(build(now: Time.current))).to eq(%i[this_weekend clubs_nearby later])
      end
    end

    it "carries a more link with the origin, the radius, and the window" do
      travel_to zone.parse("2026-10-21 10:00") do
        meet(zone.parse("2026-10-24 07:30"), "Saturday")
        section = build(now: Time.current).first

        expect(section.more[:path]).to eq("/events")
        expect(section.more[:params]).to include(near: "33.6172,-117.927", radius_km: 32,
                                                 from: "2026-10-21", to: "2026-10-25")
      end
    end

    it "shows each event once, by its next occurrence, and caps a section" do
      travel_to zone.parse("2026-10-21 10:00") do
        weekly = create_meet(:corona_del_mar, title: "Weekly", starts_at: zone.parse("2026-10-24 07:30"),
                                              cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
        create(:event_occurrence, event: weekly, starts_at: zone.parse("2026-10-25 07:30"))
        12.times { |i| meet(zone.parse("2026-10-24 08:00") + i.minutes, "Extra #{i}") }

        section = build(now: Time.current).first
        expect(section.items.size).to eq(described_class::EVENTS_PER_SECTION)
        expect(section.items.map { |row| row["title"] }.count("Weekly")).to eq(1)
        expect(section.items.first["title"]).to eq("Weekly")
      end
    end
  end
end
