require "rails_helper"

RSpec.describe EventOccurrence do
  it "copies ends_at and location from the event when they are blank (R-7)" do
    event = create(:event, venue: create(:venue, :inland))
    occurrence = create(:event_occurrence, event: event)
    expect(occurrence.ends_at).to eq(occurrence.starts_at + 120.minutes)
    expect(occurrence.location.y).to be_within(0.00001).of(34.1065)
  end

  it "is unique per event and start time, and ends after it starts" do
    occurrence = create(:event_occurrence)
    duplicate = build(:event_occurrence, event: occurrence.event, starts_at: occurrence.starts_at)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:starts_at]).to include("has already been taken")

    backwards = build(:event_occurrence, ends_at: 1.hour.ago, starts_at: Time.current)
    expect(backwards).not_to be_valid
    expect(backwards.errors[:ends_at]).to eq([ "must be after starts_at" ])
    expect(build(:event_occurrence, status: "postponed")).not_to be_valid
  end

  it "stores starts_at in UTC and exposes scheduled and upcoming scopes" do
    event = create(:event, :weekly)
    upcoming = create(:event_occurrence, event: event)
    past = create(:event_occurrence, :past, event: event)
    cancelled = create(:event_occurrence, :cancelled, event: event, starts_at: upcoming.starts_at + 7.days)

    expect(described_class.scheduled).to contain_exactly(upcoming, past)
    expect(described_class.upcoming).to contain_exactly(upcoming, cancelled)
    expect(upcoming.reload.starts_at.utc).to eq(upcoming.starts_at)
  end

  it "accepts an overridden row on an announced event (R-13)" do
    event = create(:event, :announced)
    occurrence = create(:event_occurrence, :overridden, event: event, starts_at: GeoFixtures.next_saturday_0730)
    expect(occurrence).to be_overridden
    expect(event.reload.occurrences_count).to eq(1)
  end
end
