require "rails_helper"

RSpec.describe Geo::EventsList, type: :service do
  it "picks the viewport, nearby, or direct query from the params and surfaces parameter errors" do
    event = create_meet(:corona_del_mar, title: "Near Lido")
    expect(described_class.call({ near: "33.6172,-117.9270" }).items.map { |hit| hit.event.title }).to eq([ "Near Lido" ])
    expect(described_class.call({ bbox: "-118.05,33.40,-117.60,33.70" }).items.first.distance_m).to be_nil
    expect(described_class.call({ bbox: "-118.05,33.40,-117.60,33.70", near: "33.6172,-117.9270" }).items.first.distance_m).to be_between(5_200, 5_400)
    expect(described_class.call({ host: "user:#{event.host_id}" }).items.first.next_occurrence).to eq(event.occurrences.first)
    expect(described_class.call({}).items.size).to eq(1)
    expect { described_class.call({ sort: "distance" }) }.to raise_error(Geo::ParamError, "Send near to sort by distance.")
    expect { described_class.call({ near: "33.6172,-117.9270", sort: "soonest" }) }.to raise_error(Geo::ParamError, "sort must be date or distance.")
  end

  describe Geo::Window do
    it "defaults to now plus 14 days, caps at 90, and is open ended for direct lists" do
      now = Time.current
      expect(described_class.parse(now: now)).to have_attributes(from: now, to: now + 14.days)
      expect(described_class.parse(now: now, open_ended: true).to).to be_nil
      expect(described_class.parse(from: "2026-10-01", to: "2026-10-05T12:00:00Z")).to have_attributes(from: Time.utc(2026, 10, 1), to: Time.utc(2026, 10, 5, 12))
      expect { described_class.parse(from: "2026-10-01", to: "2026-12-31") }.to raise_error(Geo::ParamError, "The window can be at most 90 days.")
      expect { described_class.parse(from: "2026-10-05", to: "2026-10-01") }.to raise_error(Geo::ParamError, "to must be after from.")
      expect { described_class.parse(from: "soon") }.to raise_error(Geo::ParamError, "from must be an ISO 8601 timestamp.")
    end
  end

  describe Geo::Cursor do
    it "round-trips a tuple and rejects garbage, another sort, or a wrong size" do
      cursor = described_class.encode(:date, [ "2026-10-24", false, "2026-10-24T14:30:00.000000Z", 5317, "abc" ])
      expect(cursor).to match(/\A[A-Za-z0-9_-]+\z/)
      expect(described_class.decode(cursor, sort: :date, size: 5)).to eq([ "2026-10-24", false, "2026-10-24T14:30:00.000000Z", 5317, "abc" ])
      expect { described_class.decode(cursor, sort: :distance, size: 3) }.to raise_error(Geo::ParamError, "cursor is invalid.")
      expect { described_class.decode(cursor, sort: :date, size: 4) }.to raise_error(Geo::ParamError)
      expect { described_class.decode("%%%", sort: :date, size: 5) }.to raise_error(Geo::ParamError)
      expect { described_class.decode(Base64.urlsafe_encode64("{}"), sort: :date, size: 5) }.to raise_error(Geo::ParamError)
    end
  end

  describe Geo::Coordinates do
    it "parses near and bbox and rejects out-of-range or malformed values" do
      expect(described_class.origin("33.6172, -117.9270")).to eq(Geo::Origin.new(lat: 33.6172, lng: -117.9270))
      expect(described_class.origin(nil)).to be_nil
      expect { described_class.origin("33.6") }.to raise_error(Geo::ParamError, "near must be lat,lng.")
      expect { described_class.origin("33.6,-181") }.to raise_error(Geo::ParamError)

      box = described_class.bbox("-118.05,33.40,-117.60,33.70")
      expect(box).to have_attributes(west: -118.05, south: 33.40, east: -117.60, north: 33.70)
      expect(box.width).to be_within(0.0001).of(0.45)
      expect { described_class.bbox("-117.60,33.40,-118.05,33.70") }.to raise_error(Geo::ParamError, "bbox must be w,s,e,n.")
      expect { described_class.bbox("-125,30,-114,40", max_degrees: 5) }.to raise_error(Geo::ParamError, /at most 5 degrees/)
      expect(described_class.bbox("-125,30,-114,40")).to be_a(Geo::Bbox)
      expect { described_class.radius_km("far") }.to raise_error(Geo::ParamError, "radius_km must be a number.")
    end
  end

  describe Geo::EventFilters do
    it "parses tags, recurring, q, host, and sponsor with 400-style errors" do
      filters = described_class.from_params({ tags: %w[jdm euro], recurring: "true", q: "  coffee ", host: "Club:#{SecureRandom.uuid}" })
      expect(filters).to have_attributes(tags: %w[jdm euro], recurring: true, q: "coffee", host_type: "Club")
      expect(filters.any_direct?).to be(true)
      expect(described_class.from_params({ tags: "all" }).tags).to eq([ "all" ])
      expect(described_class.from_params({}).any_direct?).to be(false)
      expect(described_class.from_params({ q: "x", host: "club:nope" }, geo_only: true).any_direct?).to be(false)
      expect { described_class.from_params({ tags: %w[drift] }) }.to raise_error(Geo::ParamError, /tags must be from/)
      expect { described_class.from_params({ host: "venue:#{SecureRandom.uuid}" }) }.to raise_error(Geo::ParamError, /host must be/)
      expect { described_class.from_params({ host: "club:123" }) }.to raise_error(Geo::ParamError)
      expect { described_class.from_params({ sponsor: "123" }) }.to raise_error(Geo::ParamError, "sponsor must be a UUID.")
      expect { described_class.from_params({ q: "x" * 101 }) }.to raise_error(Geo::ParamError, /at most 100/)
    end
  end
end
