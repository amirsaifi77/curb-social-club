require "rails_helper"

RSpec.describe Venues::Deduper, type: :service do
  let(:creator) { create(:user) }

  def find_or_create(name, lat, lng, **rest)
    described_class.find_or_create({ name: name, country: "US", created_by: creator, lat: lat, lng: lng }.merge(rest))
  end

  it "AC-14: reuses a venue with the same normalized name within 100 m and creates one beyond it (R-6)" do
    original = find_or_create("Back Bay Coffee", 33.6172, -117.9270)

    # About 55 m north, with a different case and doubled whitespace.
    near = find_or_create("back bay  coffee", 33.6177, -117.9270)
    expect(near.id).to eq(original.id)
    expect(Venue.count).to eq(1)

    # About 155 m north: a different place.
    far = find_or_create("Back Bay Coffee", 33.6186, -117.9270)
    expect(far.id).not_to eq(original.id)
    expect(Venue.count).to eq(2)
  end

  it "does not merge two different names at the same point, and matches the nearest of several" do
    lot = find_or_create("Lido Lot", 33.6172, -117.9270)
    other = find_or_create("Lido Garage", 33.6172, -117.9270)
    expect(other.id).not_to eq(lot.id)

    nearer = find_or_create("Lido Lot", 33.61729, -117.9270)
    expect(nearer.id).to eq(lot.id)
  end

  it "accepts a location instead of lat and lng, and carries the rest of the attributes onto a new venue" do
    created = described_class.find_or_create(name: "Ontario Mills", country: "US", created_by: creator,
                                             location: Geo.point(34.0737, -117.5545), city: "Ontario",
                                             region: "CA", timezone: "America/Los_Angeles")
    expect(created).to have_attributes(city: "Ontario", region: "CA", country: "US")
    expect(created.location.y).to be_within(0.00001).of(34.0737)
    expect(described_class.find_or_create(name: "Ontario Mills", country: "US", created_by: creator,
                                          location: Geo.point(34.0737, -117.5545)).id).to eq(created.id)
  end

  it "returns nil from find_match for a blank name and creates rather than raising" do
    expect(described_class.find_match("  ", Geo.point(33.6172, -117.9270))).to be_nil
    expect { find_or_create("Lido Marina Village", 33.6172, -117.9270) }.to change(Venue, :count).by(1)
  end
end
