require "swagger_helper"

RSpec.describe "v1/events" do
  let(:fontana) { "34.1065,-117.4356" }
  let(:lido) { "33.6172,-117.9270" }
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  it_behaves_like "anonymous-allowed", "/v1/events?near=33.6172,-117.9270"


  list_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/EventSummary" } },
      meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
    },
    required: %w[data meta]
  }

  def coastal_fixtures!
    %i[corona_del_mar huntington_beach_pier laguna_main_beach irvine_spectrum dana_point_harbor san_clemente_pier victoria_gardens]
      .each { |fixture| create_meet(fixture) }
  end

  def inland_fixtures!
    %i[victoria_gardens ontario_mills riverside_mission_inn redlands_state_street lido].each { |fixture| create_meet(fixture) }
  end

  path "/v1/events" do
    get "List events" do
      description "EventSummary rows from indexed PostGIS queries. near or bbox selects the earliest scheduled occurrence per event in the window (default now to +14 days, at most 90); host, sponsor, or q without geo lists events directly, announced ones included with a null next_occurrence. With near, radius_km defaults to 32 (80 with q) and clamps at 160. bbox with near returns the box with distance_m from near."
      tags "Events"
      produces "application/json"
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng"
      parameter name: :radius_km, in: :query, required: false, schema: { type: :number }
      parameter name: :bbox, in: :query, required: false, schema: { type: :string }, description: "w,s,e,n"
      parameter name: :from, in: :query, required: false, schema: { type: :string, format: "date-time" }
      parameter name: :to, in: :query, required: false, schema: { type: :string, format: "date-time" }
      parameter name: :'tags[]', in: :query, required: false, schema: { type: :array, items: { type: :string, enum: Event::TAGS } },
                style: :form, explode: true, description: "Any tag matches"
      parameter name: :recurring, in: :query, required: false, schema: { type: :boolean }, description: "true keeps cadence other than once"
      parameter name: :q, in: :query, required: false, schema: { type: :string }, description: "Trigram match on title and host name, ILIKE on venue name"
      parameter name: :host, getter: :host_filter, in: :query, required: false, schema: { type: :string }, description: "user:<id>, club:<id>, or sponsor:<id>"
      parameter name: :sponsor, in: :query, required: false, schema: { type: :string, format: :uuid }, description: "Events the sponsor hosts or is attached to"
      parameter name: :sort, in: :query, required: false, schema: { type: :string, enum: %w[date distance] }, description: "distance needs near"
      parameter name: :past, in: :query, required: false, schema: { type: :boolean },
                description: "Host, sponsor, and search lists only: the most recent past meets instead of upcoming ones. Ignored with near or bbox."
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "AC-1: nearby meets from Lido, nearest first within a day" do
        schema list_schema
        let(:near) { lido }
        before { coastal_fixtures! }

        run_test! do
          expect(data_titles).to eq([ "Corona Del Mar Cars and Coffee", "Huntington Beach Pier Cars and Coffee", "Laguna Main Beach Cars and Coffee",
                                      "Irvine Spectrum Cars and Coffee", "Dana Point Harbor Cars and Coffee" ])
          distances = json["data"].map { |row| row["distance_m"] }
          expect(distances).to all(be_a(Integer))
          expect(distances.first).to be_between(5_200, 5_400)
          expect(distances).to eq(distances.sort)
          expect(json.dig("meta", "next_cursor")).to be_nil
          expect(json["data"].first).to include("stale" => false, "cadence" => "once", "claimed" => false, "recurring" => false)
          expect(json["data"].first["host"]).to include("type" => "user", "verified" => false, "kind" => nil)
          expect(json["data"].first["next_occurrence"]).to include("status" => "scheduled", "timezone" => "America/Los_Angeles")
          expect(response.headers["Cache-Control"]).to include("public", "max-age=30", "stale-while-revalidate=300")
        end
      end

      response "400", "near with an unusable window, sort, or coordinates" do
        schema "$ref" => "#/components/schemas/Error"
        let(:near) { lido }
        let(:to) { 91.days.from_now.utc.iso8601 }

        run_test! do
          expect(json["error"]).to include("code" => "bad_request", "message" => "The window can be at most 90 days.")
        end
      end
    end
  end

  describe "GET /v1/events with near (R-16, R-19, R-23)" do
    it "AC-2: 80 km sorted by distance puts San Clemente sixth and Victoria Gardens seventh, and 500 km clamps to 160" do
      coastal_fixtures!
      # Bakersfield, about 195 km from Lido: inside 500 km, outside the clamp.
      far = create(:venue, location: Geo.point(35.3733, -119.0187), name: "Bakersfield")
      far_event = create(:event, :published, venue: far, title: "Too far", dtstart: GeoFixtures.next_saturday_0730)
      create(:event_occurrence, event: far_event, starts_at: far_event.dtstart)

      get "/v1/events", params: { near: lido, radius_km: 80, sort: "distance" }
      expect(response).to have_http_status(:ok)
      expect(data_titles.size).to eq(7)
      expect(data_titles[5]).to eq("San Clemente Pier Cars and Coffee")
      expect(data_titles[6]).to eq("Victoria Gardens Cars and Coffee")

      get "/v1/events", params: { near: lido, radius_km: 500, sort: "distance" }
      expect(response).to have_http_status(:ok)
      expect(data_titles.size).to eq(7)
      expect(data_titles[6]).to eq("Victoria Gardens Cars and Coffee")
      expect(data_titles).not_to include("Too far")
    end

    it "AC-3: from Fontana returns the four Inland Empire meets by starts_at then distance, without Irvine or Lido" do
      inland_fixtures!
      create_meet(:irvine_spectrum)
      get "/v1/events", params: { near: fontana }
      expect(response).to have_http_status(:ok)
      expect(data_titles).to eq([ "Victoria Gardens Cars and Coffee", "Ontario Mills Cars and Coffee",
                                  "Riverside Mission Inn Cars and Coffee", "Redlands State Street Cars and Coffee" ])
    end

    it "AC-6: a weekly meet with two Saturdays in the window is one row with the nearer Saturday" do
      travel_to zone.parse("2026-10-20 10:00") do
        first = zone.parse("2026-10-24 07:30")
        event = create_meet(:victoria_gardens, starts_at: first, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
        create(:event_occurrence, event: event, starts_at: first + 7.days)

        get "/v1/events", params: { near: fontana }
        expect(json["data"].size).to eq(1)
        expect(json["data"].first.dig("next_occurrence", "starts_at")).to eq("2026-10-24T14:30:00Z")
        expect(json["data"].first).to include("recurring" => true, "rrule_text" => "Every Saturday")
      end
    end

    it "AC-16: stale events sort after fresh ones on the same day, and claimed events are never stale (R-20, R-25)" do
      saturday = GeoFixtures.next_saturday_0730
      nearer = create_meet(:corona_del_mar, title: "Nearer", starts_at: saturday, last_confirmed_at: 31.days.ago)
      farther_venue = create(:venue, location: Geo.point(33.6172, -117.8623), name: "Six km east")
      farther = create(:event, :published, venue: farther_venue, title: "Farther", dtstart: saturday, last_confirmed_at: 1.day.ago)
      create(:event_occurrence, event: farther, starts_at: saturday)
      claimed = create_meet(:huntington_beach_pier, title: "Claimed", starts_at: saturday, claimed_at: 300.days.ago, last_confirmed_at: 200.days.ago)

      get "/v1/events", params: { near: lido }
      rows = json["data"].index_by { |row| row["title"] }
      expect(data_titles.index("Farther")).to be < data_titles.index("Nearer")
      expect(rows["Nearer"]["stale"]).to be(true)
      expect(rows["Farther"]["stale"]).to be(false)
      expect(rows["Claimed"]).to include("stale" => false, "claimed" => true)
      expect(rows["Farther"]["distance_m"]).to be > rows["Nearer"]["distance_m"]
      expect([ nearer, farther, claimed ].map(&:id)).to all(be_present)
    end

    it "AC-22 (list part): drafts, unlisted, hidden, and dormant events never appear (R-16, R-27)" do
      shown = create_meet(:corona_del_mar, title: "Shown")
      create_meet(:corona_del_mar, title: "Unlisted", visibility: "unlisted")
      create_meet(:corona_del_mar, title: "Hidden", hidden_at: Time.current)
      create_meet(:corona_del_mar, title: "Dormant", dormant_at: Time.current)
      draft = create(:event, venue: shown.venue, title: "Draft")
      create(:event_occurrence, event: draft)

      get "/v1/events", params: { near: lido }
      expect(data_titles).to eq([ "Shown" ])
    end

    it "filters by tags (any match), recurring, and defaults the radius to 80 km with q (R-19; discovery R-9)" do
      create_meet(:corona_del_mar, title: "JDM", tags: %w[jdm])
      create_meet(:corona_del_mar, title: "Euro weekly", tags: %w[euro], cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
      create_meet(:san_clemente_pier, title: "Pier classics", tags: %w[classic])

      get "/v1/events", params: { near: lido, "tags[]": %w[jdm classic] }
      expect(data_titles).to eq([ "JDM" ])
      get "/v1/events", params: { near: lido, recurring: "true" }
      expect(data_titles).to eq([ "Euro weekly" ])
      get "/v1/events", params: { near: lido, q: "pier classics" }
      expect(data_titles).to eq([ "Pier classics" ])
      get "/v1/events", params: { near: lido, q: "pier classics", radius_km: 20 }
      expect(data_titles).to eq([])
      get "/v1/events", params: { near: lido, "tags[]": %w[drift] }
      expect(response).to have_http_status(:bad_request)
    end

    it "paginates with an opaque cursor that only replays against its own sort (R-20)" do
      saturday = GeoFixtures.next_saturday_0730
      5.times { |i| create_meet(:corona_del_mar, title: "Meet #{i}", starts_at: saturday + i.minutes) }

      get "/v1/events", params: { near: lido, limit: 2 }
      expect(data_titles).to eq([ "Meet 0", "Meet 1" ])
      cursor = json.dig("meta", "next_cursor")
      expect(cursor).to be_present

      get "/v1/events", params: { near: lido, limit: 2, cursor: cursor }
      expect(data_titles).to eq([ "Meet 2", "Meet 3" ])
      get "/v1/events", params: { near: lido, limit: 2, cursor: json.dig("meta", "next_cursor") }
      expect(data_titles).to eq([ "Meet 4" ])
      expect(json.dig("meta", "next_cursor")).to be_nil

      get "/v1/events", params: { near: lido, limit: 2, sort: "distance", cursor: cursor }
      expect(response).to have_http_status(:bad_request)
      get "/v1/events", params: { near: lido, cursor: "not-a-cursor" }
      expect(response).to have_http_status(:bad_request)
      get "/v1/events", params: { near: lido, limit: 500 }
      expect(data_titles.size).to eq(5)
      get "/v1/events?near=#{lido}&limit[]=1"
      expect(response).to have_http_status(:bad_request)
      expect(json.dig("error", "message")).to eq("limit must be an integer between 1 and 50.")
      get "/v1/events", params: { near: lido, limit: "many" }
      expect(response).to have_http_status(:bad_request)
    end

    it "pages every row when published_at is null, which SQL would otherwise make stale NULL (R-25)" do
      saturday = GeoFixtures.next_saturday_0730
      %w[A B C].each_with_index { |name, i| create_meet(:corona_del_mar, title: name, starts_at: saturday + i.minutes) }
      # The seed importer upserts on slug and skips the publish callback.
      Event.find_by(title: "B").update_columns(published_at: nil, last_confirmed_at: nil)

      seen = []
      cursor = nil
      3.times do
        get "/v1/events", params: { near: lido, limit: 1, cursor: cursor }.compact
        seen.concat(data_titles)
        cursor = json.dig("meta", "next_cursor")
      end
      expect(seen).to eq(%w[A B C])
    end

    it "returns 400 with the spec messages for a bad near, sort=distance without near, and a wrong sort" do
      get "/v1/events", params: { near: "91,0" }
      expect(json.dig("error", "message")).to eq("near must be lat,lng.")
      get "/v1/events", params: { sort: "distance" }
      expect(json["error"]).to include("code" => "bad_request", "message" => "Send near to sort by distance.")
      get "/v1/events", params: { near: lido, sort: "nearest" }
      expect(response).to have_http_status(:bad_request)
      get "/v1/events", params: { near: lido, radius_km: "far" }
      expect(response).to have_http_status(:bad_request)
      get "/v1/events", params: { near: lido, from: "yesterday" }
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "GET /v1/events with bbox (R-17; discovery R-8)" do
    it "AC-4: the coastal box returns six meets and accepts near for distance_m" do
      coastal_fixtures!
      get "/v1/events", params: { bbox: "-118.05,33.40,-117.60,33.70" }
      expect(response).to have_http_status(:ok)
      expect(data_titles).to contain_exactly("Corona Del Mar Cars and Coffee", "Huntington Beach Pier Cars and Coffee", "Laguna Main Beach Cars and Coffee",
                                             "Irvine Spectrum Cars and Coffee", "Dana Point Harbor Cars and Coffee", "San Clemente Pier Cars and Coffee")
      expect(json["data"].map { |row| row["distance_m"] }).to all(be_nil)

      get "/v1/events", params: { bbox: "-118.05,33.40,-117.60,33.70", near: lido }
      expect(response).to have_http_status(:ok)
      expect(data_titles.size).to eq(6)
      expect(json["data"].map { |row| row["distance_m"] }).to all(be_a(Integer))

      get "/v1/events", params: { bbox: "-118.05,33.40,-117.60" }
      expect(json.dig("error", "message")).to eq("bbox must be w,s,e,n.")
    end

    it "discovery AC-6: ten meets in a box with near inside sort by distance, then by starts_at with sort=date" do
      saturday = GeoFixtures.next_saturday_0730
      10.times do |i|
        venue = create(:venue, location: Geo.point(33.60 + (0.01 * i), -117.90), name: "Spot #{i}")
        event = create(:event, :published, venue: venue, title: "Meet #{i}", dtstart: saturday + ((9 - i) * 5).minutes)
        create(:event_occurrence, event: event, starts_at: event.dtstart)
      end
      box = "-117.95,33.55,-117.85,33.75"

      get "/v1/events", params: { bbox: box, near: "33.60,-117.90", sort: "distance" }
      expect(data_titles).to eq((0..9).map { |i| "Meet #{i}" })
      distances = json["data"].map { |row| row["distance_m"] }
      expect(distances).to eq(distances.sort)

      get "/v1/events", params: { bbox: box, near: "33.60,-117.90", sort: "date" }
      expect(data_titles).to eq((0..9).to_a.reverse.map { |i| "Meet #{i}" })
      starts = json["data"].map { |row| row.dig("next_occurrence", "starts_at") }
      expect(starts).to eq(starts.sort)
    end
  end

  describe "GET /v1/events without geo (R-18; discovery R-9)" do
    it "AC-10 (host part): lists a club's announced event with the announced copy and a null next_occurrence" do
      club = create(:club, name: "Back Bay Air-Cooled")
      announced = create(:event, :announced, :published, host: club, title: "Announced meet")
      dated = create_meet(:corona_del_mar, title: "Dated meet", host: club)
      create_meet(:corona_del_mar, title: "Other club meet", host: create(:club))

      get "/v1/events", params: { host: "club:#{club.id}" }
      expect(response).to have_http_status(:ok)
      expect(data_titles).to eq([ "Dated meet", "Announced meet" ])
      rows = json["data"].index_by { |row| row["title"] }
      expect(rows["Announced meet"]).to include("rrule_text" => "Dates announced by the host", "next_occurrence" => nil, "distance_m" => nil)
      expect(rows["Announced meet"]["host"]).to include("type" => "club", "id" => club.id, "slug" => club.slug, "name" => "Back Bay Air-Cooled")
      expect(rows["Dated meet"]["next_occurrence"]).to include("id" => dated.occurrences.first.id)
      expect([ announced ].map(&:id)).to all(be_present)

      get "/v1/events", params: { host: "venue:#{club.id}" }
      expect(response).to have_http_status(:bad_request)
    end

    it "lists a sponsor's hosted and attached events, and sponsors_preview holds at most two by position" do
      sponsor = create(:sponsor, name: "Harbor Coffee")
      hosted = create_meet(:corona_del_mar, title: "Hosted", host: sponsor)
      attached = create_meet(:corona_del_mar, title: "Attached")
      create(:event_sponsorship, event: attached, sponsor: sponsor, role: "coffee", position: 2)
      create(:event_sponsorship, event: attached, sponsor: create(:sponsor, name: "First"), role: "presented_by", position: 0)
      create(:event_sponsorship, event: attached, sponsor: create(:sponsor, name: "Second"), role: "vendor", position: 1)
      create_meet(:corona_del_mar, title: "Unrelated")

      get "/v1/events", params: { sponsor: sponsor.id }
      expect(data_titles).to contain_exactly("Hosted", "Attached")
      rows = json["data"].index_by { |row| row["title"] }
      expect(rows["Hosted"]["host"]).to include("type" => "sponsor", "kind" => "brand", "name" => "Harbor Coffee")
      expect(rows["Attached"]["sponsors_preview"].map { |s| s["name"] }).to eq(%w[First Second])
      expect(rows["Attached"]["sponsors_preview"].first).to include("role" => "presented_by", "slug" => be_a(String))
      expect(hosted.id).to be_present
    end

    it "discovery AC-7 (events part): q with near 100 km away finds nothing, q alone finds the event" do
      club = create(:club, name: "Back Bay Air-Cooled")
      create_meet(:lido, title: "Back Bay Coffee", host: club)
      create_meet(:lido, title: "Sunday Sunrise Meet")

      get "/v1/events", params: { q: "back bay", near: "32.7157,-117.1611" }
      expect(data_titles).to eq([])

      get "/v1/events", params: { q: "back bay" }
      expect(data_titles).to eq([ "Back Bay Coffee" ])
      expect(json["data"].first["distance_m"]).to be_nil

      get "/v1/events", params: { q: "air-cooled" }
      expect(data_titles).to eq([ "Back Bay Coffee" ])
    end

    it "orders by next occurrence with nulls last and pages with its own cursor" do
      saturday = GeoFixtures.next_saturday_0730
      user = create(:user)
      create(:event, :announced, :published, host: user, title: "No date")
      create_meet(:lido, title: "Later", host: user, starts_at: saturday + 7.days)
      create_meet(:lido, title: "Sooner", host: user, starts_at: saturday)

      get "/v1/events", params: { host: "user:#{user.id}", limit: 2 }
      expect(data_titles).to eq([ "Sooner", "Later" ])
      get "/v1/events", params: { host: "user:#{user.id}", limit: 2, cursor: json.dig("meta", "next_cursor") }
      expect(data_titles).to eq([ "No date" ])
      expect(json.dig("meta", "next_cursor")).to be_nil

      get "/v1/events"
      expect(response).to have_http_status(:ok)
      expect(data_titles).to eq([ "Sooner", "Later", "No date" ])
    end
  end
end
