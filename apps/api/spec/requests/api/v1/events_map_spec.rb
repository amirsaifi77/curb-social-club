require "swagger_helper"

RSpec.describe "v1/events/map" do
  let(:fontana_box) { "-117.55,34.05,-117.35,34.15" }
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  it_behaves_like "anonymous-allowed", "/v1/events/map?bbox=-118.05,33.40,-117.60,33.70"


  map_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/MapPin" } },
      meta: { type: :object, properties: { truncated: { type: :boolean } }, required: %w[truncated] }
    },
    required: %w[data meta]
  }

  path "/v1/events/map" do
    get "Map pins in a viewport" do
      description "One MapPin per event (its earliest scheduled occurrence in the window) inside bbox, the soonest 500 by starts_at, with meta.truncated when the box held more. bbox is required and at most 5 degrees wide."
      tags "Events"
      produces "application/json"
      parameter name: :bbox, in: :query, required: true, schema: { type: :string }, description: "w,s,e,n"
      parameter name: :from, in: :query, required: false, schema: { type: :string, format: "date-time" }
      parameter name: :to, in: :query, required: false, schema: { type: :string, format: "date-time" }
      parameter name: :'tags[]', in: :query, required: false, schema: { type: :array, items: { type: :string, enum: Event::TAGS } },
                style: :form, explode: true
      parameter name: :recurring, in: :query, required: false, schema: { type: :boolean }

      response "200", "AC-5: 501 occurrences give the soonest 500 pins and truncated" do
        schema map_schema
        let(:bbox) { fontana_box }
        before { bulk_meets(501, lat: 34.1065, lng: -117.4356, starts_at: GeoFixtures.next_saturday_0730) }

        run_test! do
          expect(json["data"].size).to eq(500)
          expect(json.dig("meta", "truncated")).to be(true)
          starts = json["data"].map { |pin| pin["starts_at"] }
          expect(starts).to eq(starts.sort)
          expect(starts.last).to eq((GeoFixtures.next_saturday_0730 + 499.minutes).utc.iso8601)
          expect(json["data"].first).to include("lat" => be_within(0.0001).of(34.1065), "lng" => be_within(0.0001).of(-117.4356), "going_count" => 0)
          expect(json["data"].first.keys).to contain_exactly("id", "event_id", "slug", "lat", "lng", "starts_at", "title", "going_count")
        end
      end

      response "400", "bbox missing or wider than 5 degrees" do
        schema "$ref" => "#/components/schemas/Error"
        let(:bbox) { "-125,30,-114,40" }

        run_test! do
          expect(json["error"]).to include("code" => "bad_request", "message" => "bbox can be at most 5 degrees wide. Zoom in.")
        end
      end
    end
  end

  describe "GET /v1/events/map" do
    it "AC-5: twelve occurrences give twelve pins and truncated false" do
      bulk_meets(12, lat: 34.1065, lng: -117.4356, starts_at: GeoFixtures.next_saturday_0730)
      get "/v1/events/map", params: { bbox: fontana_box }
      expect(json["data"].size).to eq(12)
      expect(json.dig("meta", "truncated")).to be(false)
    end

    it "discovery AC-5: 600 occurrences truncate at 500, and recurring=true keeps only recurring events' pins" do
      saturday = GeoFixtures.next_saturday_0730
      bulk_meets(600, lat: 34.1065, lng: -117.4356, starts_at: saturday)
      weekly_ids = bulk_meets(3, lat: 34.1090, lng: -117.5310, starts_at: saturday - 1.hour, cadence: "weekly", title: "Weekly")

      get "/v1/events/map", params: { bbox: fontana_box }
      expect(json["data"].size).to eq(500)
      expect(json.dig("meta", "truncated")).to be(true)

      get "/v1/events/map", params: { bbox: fontana_box, recurring: "true" }
      expect(json["data"].map { |pin| pin["event_id"] }).to match_array(weekly_ids)
      expect(json.dig("meta", "truncated")).to be(false)
    end

    it "AC-6: one pin per event at its nearer Saturday, honoring the window and tags (R-21)" do
      travel_to zone.parse("2026-10-20 10:00") do
        first = zone.parse("2026-10-24 07:30")
        event = create_meet(:victoria_gardens, starts_at: first, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA", tags: %w[euro])
        create(:event_occurrence, event: event, starts_at: first + 7.days)
        create_meet(:victoria_gardens, title: "Far off", starts_at: first + 30.days)
        create_meet(:lido, title: "Outside the box", starts_at: first)

        get "/v1/events/map", params: { bbox: fontana_box }
        expect(json["data"].size).to eq(1)
        expect(json["data"].first).to include("event_id" => event.id, "starts_at" => "2026-10-24T14:30:00Z", "slug" => event.slug)

        get "/v1/events/map", params: { bbox: fontana_box, from: "2026-10-26T00:00:00Z", to: "2026-11-30T00:00:00Z" }
        expect(json["data"].map { |pin| pin["title"] }).to contain_exactly(event.title, "Far off")

        get "/v1/events/map", params: { bbox: fontana_box, "tags[]": %w[jdm] }
        expect(json["data"]).to eq([])
      end
    end

    it "leaves draft, unlisted, hidden, and dormant events off the map (R-27)" do
      shown = create_meet(:victoria_gardens, title: "Shown")
      create_meet(:victoria_gardens, title: "Unlisted", visibility: "unlisted")
      create_meet(:victoria_gardens, title: "Hidden", hidden_at: Time.current)
      create_meet(:victoria_gardens, title: "Dormant", dormant_at: Time.current)
      draft = create(:event, venue: shown.venue, title: "Draft")
      create(:event_occurrence, event: draft)

      get "/v1/events/map", params: { bbox: fontana_box }
      expect(json["data"].map { |pin| pin["title"] }).to eq([ "Shown" ])
    end

    it "requires bbox and rejects a malformed one" do
      get "/v1/events/map"
      expect(response).to have_http_status(:bad_request)
      expect(json.dig("error", "message")).to eq("Send bbox as w,s,e,n.")
      get "/v1/events/map", params: { bbox: "-117.5,34.2,-117.3,34.1" }
      expect(json.dig("error", "message")).to eq("bbox must be w,s,e,n.")
    end
  end
end
