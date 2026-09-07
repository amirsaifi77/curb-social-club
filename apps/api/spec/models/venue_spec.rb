require "rails_helper"

RSpec.describe Venue do
  it "requires a location, an ISO country, a valid IANA timezone, and a known source (R-6)" do
    expect(build(:venue)).to be_valid
    expect(build(:venue, location: nil)).not_to be_valid
    expect(build(:venue, country: "USA")).not_to be_valid
    expect(build(:venue, country: "us")).not_to be_valid
    expect(build(:venue, timezone: "Pacific Time")).not_to be_valid
    expect(build(:venue, timezone: "Pacific Time (US & Canada)")).not_to be_valid
    expect(build(:venue, timezone: "America/New_York")).to be_valid
    expect(build(:venue, external_source: "yelp")).not_to be_valid
    expect(described_class.new.timezone).to eq("America/Los_Angeles")
  end

  it "stores the fixture coordinates as geography(Point,4326)" do
    venue = create(:venue, :inland)
    expect(venue.reload.location.y).to be_within(0.00001).of(34.1065)
    expect(venue.location.x).to be_within(0.00001).of(-117.4356)
    expect(venue.location.srid).to eq(4326)
  end

  it "normalizes names for the deduper" do
    expect(described_class.normalize_name("  Back Bay   Coffee ")).to eq("back bay coffee")
  end

  it "AC-15: moving a venue moves future scheduled occurrences and leaves past rows alone (R-8)" do
    venue = create(:venue, :coastal)
    event = create(:event, :weekly, :published, venue: venue)
    other_event = create(:event, :weekly, :published, venue: venue)
    future_one = create(:event_occurrence, event: event)
    future_two = create(:event_occurrence, event: other_event, starts_at: future_one.starts_at + 7.days)
    past = create(:event_occurrence, :past, event: event)
    cancelled = create(:event_occurrence, :cancelled, event: event, starts_at: future_one.starts_at + 14.days)
    elsewhere = create(:event_occurrence, event: create(:event, :published, venue: create(:venue, :inland)))

    # About 300 m north of Lido.
    venue.update!(location: Geo.point(33.6199, -117.9270))

    [ future_one, future_two ].each do |occurrence|
      expect(occurrence.reload.location.y).to be_within(0.00001).of(33.6199)
    end
    expect(past.reload.location.y).to be_within(0.00001).of(33.6172)
    expect(cancelled.reload.location.y).to be_within(0.00001).of(33.6172)
    expect(elsewhere.reload.location.y).to be_within(0.00001).of(34.1065)
  end

  it "does not touch occurrences when other columns change" do
    venue = create(:venue, :coastal)
    occurrence = create(:event_occurrence, event: create(:event, venue: venue))
    expect { venue.update!(name: "Renamed") }.not_to(change { occurrence.reload.updated_at })
  end

  it "cannot be destroyed while events reference it" do
    venue = create(:venue)
    create(:event, venue: venue)
    expect(venue.destroy).to be(false)
    expect(venue.errors[:base]).to be_present
  end
end
