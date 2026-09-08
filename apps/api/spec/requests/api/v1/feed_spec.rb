require "swagger_helper"

RSpec.describe "v1/feed" do
  # A Wednesday, so "this weekend" runs to Sunday the 25th.
  let(:wednesday) { zone.parse("2026-10-21 10:00") }
  let(:lido) { "33.6172,-117.9270" }
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  it_behaves_like "anonymous-allowed", "/v1/feed?near=33.6172,-117.9270"


  feed_schema = {
    type: :object,
    properties: {
      data: {
        type: :object,
        properties: {
          sections: {
            type: :array,
            items: {
              type: :object,
              properties: {
                kind: { type: :string, enum: %w[this_weekend clubs_nearby sponsors_nearby next_week later] },
                title: { type: :string },
                items: { type: :array, items: { type: :object, additionalProperties: true } },
                more: {
                  type: :object, nullable: true,
                  properties: { path: { type: :string }, params: { type: :object, additionalProperties: true } },
                  required: %w[path params]
                }
              },
              required: %w[kind title items more]
            }
          }
        },
        required: %w[sections]
      },
      meta: { type: :object, properties: { generated_at: { type: :string, format: "date-time" } }, required: %w[generated_at] }
    },
    required: %w[data meta]
  }

  def meet_at(fixture, starts_at, **attrs)
    create_meet(fixture, starts_at: starts_at, **attrs)
  end

  def kinds = json.dig("data", "sections").map { |section| section["kind"] }
  def section(kind) = json.dig("data", "sections").find { |row| row["kind"] == kind }

  path "/v1/feed" do
    get "Sectioned home feed" do
      description "Sections in display order with empty ones omitted (discovery R-5, R-6). Windows are local calendar days in the venue's timezone: this_weekend runs to the coming Sunday, next_week is the Monday to Sunday after it, later is the rest of the 90 day horizon. Served from Solid Cache for 60 seconds (R-24)."
      tags "Feed"
      produces "application/json"
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng; falls back to the device home area"
      parameter name: :radius_km, in: :query, required: false, schema: { type: :number }, description: "Default 32, 400 above 160"

      response "200", "AC-1: one meet in each window plus a club nearby" do
        schema feed_schema
        let(:near) { lido }

        before do
          travel_to wednesday
          meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30"), title: "Saturday meet")
          meet_at(:huntington_beach_pier, zone.parse("2026-10-28 18:00"), title: "Next Wednesday meet")
          meet_at(:huntington_beach_pier, zone.parse("2026-11-25 18:00"), title: "Five weeks out")
          create(:club, name: "Nearby Club", home_location: Geo.point(33.7071, -117.9270))
        end

        after { travel_back }

        run_test! do
          expect(kinds).to eq(%w[this_weekend clubs_nearby next_week later])
          expect(kinds).not_to include("following", "recent_photos", "sponsors_nearby", "spots_nearby")
          expect(json.dig("data", "sections").map { |row| row["items"].size }).to eq([ 1, 1, 1, 1 ])
          expect(section("this_weekend")["title"]).to eq("This weekend")
          expect(section("this_weekend")["items"].first["title"]).to eq("Saturday meet")
          expect(section("clubs_nearby")["items"].first["name"]).to eq("Nearby Club")
          expect(section("next_week")["items"].first["title"]).to eq("Next Wednesday meet")
          expect(section("later")["items"].first["title"]).to eq("Five weeks out")
          expect(section("this_weekend")["more"]).to include("path" => "/events")
          expect(json.dig("meta", "generated_at")).to match(/\A\d{4}-\d{2}-\d{2}T/)
        end
      end

      response "400", "AC-4: a radius above the maximum" do
        schema "$ref" => "#/components/schemas/Error"
        let(:near) { lido }
        let(:radius_km) { 200 }

        run_test! do
          expect(json["error"]).to include("code" => "bad_request", "message" => "radius_km can be at most 160.")
        end
      end
    end
  end

  describe "GET /v1/feed" do
    it "AC-4: the radius decides what is in the feed (R-3)" do
      travel_to wednesday do
        # About 20 km and 60 km north of Lido.
        near_meet = create(:event, :published, title: "Twenty km", dtstart: zone.parse("2026-10-24 07:30"),
                                               venue: create(:venue, location: Geo.point(33.7972, -117.9270)))
        far_meet = create(:event, :published, title: "Sixty km", dtstart: zone.parse("2026-10-24 08:00"),
                                              venue: create(:venue, location: Geo.point(34.1572, -117.9270)))
        [ near_meet, far_meet ].each { |event| create(:event_occurrence, event: event, starts_at: event.dtstart) }

        get "/v1/feed", params: { near: lido, radius_km: 32 }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "Twenty km" ])

        get "/v1/feed", params: { near: lido, radius_km: 80 }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "Twenty km", "Sixty km" ])

        get "/v1/feed", params: { near: lido, radius_km: 200 }
        expect(response).to have_http_status(:bad_request)
      end
    end

    it "clubs AC-9: two active clubs inside 40 km give a clubs_nearby section of two" do
      travel_to wednesday do
        create(:club, name: "Two km", home_location: Geo.point(33.6352, -117.9270))
        create(:club, name: "Ten km", home_location: Geo.point(33.7071, -117.9270))
        create(:club, :hidden, name: "Hidden", home_location: Geo.point(33.6352, -117.9270))
        create(:club, name: "Sixty km", home_location: Geo.point(34.1572, -117.9270))

        get "/v1/feed", params: { near: lido, radius_km: 40 }
        expect(section("clubs_nearby")["items"].map { |row| row["name"] }).to eq([ "Two km", "Ten km" ])
        expect(section("clubs_nearby")["more"]).to include("path" => "/clubs")
      end
    end

    it "sponsors AC-11: only a sponsor with a nearby upcoming meet appears, and cancelling it removes the section" do
      travel_to wednesday do
        attached = create(:sponsor, name: "Has a meet", home_location: Geo.point(33.6352, -117.9270))
        create(:sponsor, name: "No meet", home_location: Geo.point(33.6352, -117.9270))
        far_meet_sponsor = create(:sponsor, name: "Meet is far", home_location: Geo.point(33.6352, -117.9270))

        saturday = meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30"), title: "Saturday meet")
        create(:event_sponsorship, event: saturday, sponsor: attached)
        far = create(:event, :published, title: "Far meet", dtstart: zone.parse("2026-10-24 09:00"),
                                         venue: create(:venue, location: Geo.point(34.2572, -117.9270)))
        create(:event_occurrence, event: far, starts_at: far.dtstart)
        create(:event_sponsorship, event: far, sponsor: far_meet_sponsor)

        get "/v1/feed", params: { near: lido }
        expect(section("sponsors_nearby")["items"].map { |row| row["name"] }).to eq([ "Has a meet" ])
        expect(kinds.index("sponsors_nearby")).to eq(kinds.index("clubs_nearby") + 1) if kinds.include?("clubs_nearby")

        saturday.occurrences.update_all(status: "cancelled")
        get "/v1/feed", params: { near: lido }
        expect(kinds).not_to include("sponsors_nearby")
      end
    end

    it "sponsors AC-12: six eligible sponsors give four, soonest meet first, with no paid key (R-13)" do
      travel_to wednesday do
        6.times do |i|
          sponsor = create(:sponsor, name: "Sponsor #{i}", home_location: Geo.point(33.6352 + (i * 0.001), -117.9270))
          meet = meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30") + i.hours, title: "Meet #{i}")
          create(:event_sponsorship, event: meet, sponsor: sponsor)
        end

        get "/v1/feed", params: { near: lido }
        items = section("sponsors_nearby")["items"]
        expect(items.map { |row| row["name"] }).to eq([ "Sponsor 0", "Sponsor 1", "Sponsor 2", "Sponsor 3" ])
        expect(items.map(&:keys).flatten.uniq).not_to include("paid")
        expect(items.first["distance_m"]).to be_a(Integer)
      end
    end

    it "event-detail AC-2: an unlisted meet never reaches the feed (R-27, events R-5)" do
      travel_to wednesday do
        meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30"), title: "Public meet")
        meet_at(:corona_del_mar, zone.parse("2026-10-24 08:00"), title: "Unlisted meet", visibility: "unlisted")
        meet_at(:corona_del_mar, zone.parse("2026-10-24 08:30"), title: "Dormant meet", dormant_at: Time.current)

        get "/v1/feed", params: { near: lido }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "Public meet" ])
      end
    end

    it "R-6: a Sunday 23:30 meet is still this weekend, and Monday 00:30 is next week" do
      travel_to wednesday do
        meet_at(:corona_del_mar, zone.parse("2026-10-25 23:30"), title: "Late Sunday")
        meet_at(:corona_del_mar, zone.parse("2026-10-26 00:30"), title: "Early Monday")

        get "/v1/feed", params: { near: lido }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "Late Sunday" ])
        expect(section("next_week")["items"].map { |row| row["title"] }).to eq([ "Early Monday" ])
      end
    end

    it "R-24: the response is cached for 60 seconds per rounded origin, radius, and viewer" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      travel_to wednesday do
        meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30"), title: "First")

        get "/v1/feed", params: { near: lido }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "First" ])

        meet_at(:corona_del_mar, zone.parse("2026-10-24 08:00"), title: "Second")
        get "/v1/feed", params: { near: lido }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "First" ])

        # A different rounded origin, radius, or viewer is a different key.
        get "/v1/feed", params: { near: "33.9172,-117.9270", radius_km: 80 }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "First", "Second" ])

        travel 61.seconds
        get "/v1/feed", params: { near: lido }
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "First", "Second" ])
      end
    end

    it "falls back to the device home area and 400s without either" do
      travel_to wednesday do
        meet_at(:corona_del_mar, zone.parse("2026-10-24 07:30"), title: "Saturday meet")
        device = create(:device, home_location: Geo.point(33.6172, -117.9270))

        get "/v1/feed", headers: { "X-Device-Id" => device.anonymous_id }
        expect(response).to have_http_status(:ok)
        expect(section("this_weekend")["items"].map { |row| row["title"] }).to eq([ "Saturday meet" ])

        get "/v1/feed"
        expect(response).to have_http_status(:bad_request)
        expect(json.dig("error", "message")).to eq("Send near as lat,lng, or a device with a home area.")
        get "/v1/feed", params: { near: "nope" }
        expect(response).to have_http_status(:bad_request)
      end
    end

    it "omits every empty section" do
      get "/v1/feed", params: { near: lido }
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "sections")).to eq([])
    end
  end
end
