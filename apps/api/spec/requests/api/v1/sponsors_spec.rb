require "swagger_helper"

RSpec.describe "v1/sponsors" do
  let(:lido) { "33.6172,-117.9270" }

  it_behaves_like "anonymous-allowed", "/v1/sponsors"


  sponsor_list_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/SponsorSummary" } },
      meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
    },
    required: %w[data meta]
  }

  path "/v1/sponsors/{slug}" do
    get "Sponsor detail" do
      description "The Sponsor shape with up to three upcoming meets, each labelled host or sponsor (R-6, R-8). A hidden sponsor is 404."
      tags "Sponsors"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }

      response "200", "AC-1: a venue sponsor hosting one meet and attached to two" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Sponsor" } }, required: %w[data]
        let!(:sponsor) do
          record = create(:sponsor, :venue_partner, name: "Lido Marina Village", website: "https://example.com")
          create_meet(:lido, title: "Hosted meet", host: record)
          2.times do |i|
            attached = create_meet(:corona_del_mar, title: "Attached #{i}", starts_at: GeoFixtures.next_saturday_0730 + (i + 1).days)
            create(:event_sponsorship, event: attached, sponsor: record)
          end
          record
        end
        let(:slug) { sponsor.slug }

        run_test! do
          data = json["data"]
          expect(data).to include("kind" => "venue", "slug" => sponsor.slug, "website" => "https://example.com",
                                  "events_count" => 3, "distance_m" => nil)
          expect(data["viewer"]).to eq({ "following" => false })
          relations = data["upcoming_events"].map { |row| row["relation"] }
          expect(data["upcoming_events"].size).to eq(3)
          expect(relations.count("host")).to eq(1)
          expect(relations.count("sponsor")).to eq(2)
        end
      end

      response "404", "AC-3: a hidden sponsor" do
        schema "$ref" => "#/components/schemas/Error"
        let(:slug) { create(:sponsor, :hidden).slug }
        run_test!
      end
    end
  end

  path "/v1/sponsors" do
    get "Sponsor directory" do
      description "Active sponsors, nearest first with distance_m when near is present, most followed first otherwise; kind and q filter (R-7, R-17)."
      tags "Sponsors"
      produces "application/json"
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng"
      parameter name: :radius_km, in: :query, required: false, schema: { type: :number }
      parameter name: :kind, in: :query, required: false, schema: { type: :string, enum: Sponsor::KINDS }
      parameter name: :q, in: :query, required: false, schema: { type: :string }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "AC-4: sponsors at 3 and 12 km, ordered, with distance_m" do
        schema sponsor_list_schema
        let(:near) { lido }
        let(:radius_km) { 40 }
        let!(:sponsors) do
          create(:sponsor, name: "Three km", kind: "brand", home_location: Geo.point(33.6442, -117.9270))
          create(:sponsor, name: "Twelve km", kind: "vendor", home_location: Geo.point(33.7252, -117.9270))
          create(:sponsor, name: "Seventy km", kind: "venue", home_location: Geo.point(34.2472, -117.9270))
        end

        run_test! do
          expect(json["data"].map { |row| row["name"] }).to eq([ "Three km", "Twelve km" ])
          distances = json["data"].map { |row| row["distance_m"] }
          expect(distances).to all(be_a(Integer))
          expect(distances.first).to be_between(2_800, 3_200)
        end
      end
    end
  end

  path "/v1/sponsors/{slug}/events" do
    get "Meets a sponsor hosts or backs" do
      description "EventSummary rows with relation host or sponsor, deduplicated with host winning (R-8). Equivalent to GET /events?sponsor=<id>."
      tags "Sponsors"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }
      parameter name: :past, in: :query, required: false, schema: { type: :boolean }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "hosted and attached meets" do
        schema type: :object,
               properties: {
                 data: {
                   type: :array,
                   items: {
                     allOf: [
                       { "$ref" => "#/components/schemas/EventSummary" },
                       { type: :object, properties: { relation: { type: :string, enum: %w[host sponsor] } }, required: %w[relation] }
                     ]
                   }
                 },
                 meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
               },
               required: %w[data meta]
        let!(:sponsor) do
          record = create(:sponsor)
          create_meet(:lido, title: "Hosted", host: record)
          record
        end
        let(:slug) { sponsor.slug }

        run_test! { expect(json["data"].first["relation"]).to eq("host") }
      end
    end
  end

  path "/v1/sponsors/{id}" do
    patch "Update a sponsor" do
      description "Post-launch (R-11). Returns 403 not_enabled while sponsors_self_service is off."
      tags "Sponsors"
      produces "application/json"
      security [ { bearer: [] } ]
      parameter name: :id, in: :path, schema: { type: :string, format: :uuid }

      response "403", "AC-10: sponsors_self_service is off" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { "Bearer #{Auth::SessionIssuer.issue(create(:user)).token}" }
        let(:id) { create(:sponsor).id }

        run_test! do
          expect(json["error"]).to include("code" => "not_enabled")
          expect(json.dig("error", "message")).to eq(HostPages::SPONSORS_NOT_ENABLED)
        end
      end
    end
  end

  describe "sponsor reads" do
    it "AC-2: an event the sponsor hosts and is attached to appears once, as host (R-8)" do
      sponsor = create(:sponsor)
      both = create_meet(:lido, title: "Both", host: sponsor)
      create(:event_sponsorship, event: both, sponsor: sponsor)

      get "/v1/sponsors/#{sponsor.slug}/events"
      expect(data_titles).to eq([ "Both" ])
      expect(json["data"].first["relation"]).to eq("host")
    end

    it "AC-3: a hidden sponsor leaves the list, the sponsorships, and the preview, but still hosts (R-5, R-9)" do
      hidden = create(:sponsor, :hidden, name: "Hidden Sponsor")
      hosted = create_meet(:lido, title: "Hosted by hidden", host: hidden)
      attached = create_meet(:corona_del_mar, title: "Attached")
      create(:event_sponsorship, event: attached, sponsor: hidden, position: 0)
      visible = create(:sponsor, name: "Visible Sponsor")
      create(:event_sponsorship, event: attached, sponsor: visible, position: 1)

      get "/v1/sponsors"
      expect(json["data"].map { |row| row["name"] }).to eq([ "Visible Sponsor" ])

      get "/v1/events/#{hosted.slug}"
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "host")).to include("type" => "sponsor", "name" => "Hidden Sponsor")

      get "/v1/events/#{attached.slug}"
      expect(json.dig("data", "sponsorships").map { |row| row.dig("sponsor", "name") }).to eq([ "Visible Sponsor" ])

      get "/v1/events", params: { near: lido }
      preview = json["data"].find { |row| row["title"] == "Attached" }["sponsors_preview"]
      expect(preview.map { |row| row["name"] }).to eq([ "Visible Sponsor" ])
    end

    it "AC-4: kind narrows the directory" do
      create(:sponsor, name: "Brandy", kind: "brand", home_location: Geo.point(33.6442, -117.9270))
      create(:sponsor, name: "Vendy", kind: "vendor", home_location: Geo.point(33.7252, -117.9270))

      get "/v1/sponsors", params: { near: lido, radius_km: 40, kind: "vendor" }
      expect(json["data"].map { |row| row["name"] }).to eq([ "Vendy" ])
      get "/v1/sponsors", params: { kind: "agency" }
      expect(response).to have_http_status(:bad_request)
    end

    it "AC-5: sponsors_preview holds the two lowest positions and sponsorships holds all three in order" do
      event = create_meet(:corona_del_mar, title: "Three sponsors")
      create(:event_sponsorship, event: event, sponsor: create(:sponsor, name: "Second"), position: 2, role: "vendor")
      create(:event_sponsorship, event: event, sponsor: create(:sponsor, name: "First"), position: 1, role: "presented_by")
      create(:event_sponsorship, event: event, sponsor: create(:sponsor, name: "Third"), position: 3, role: "partner")

      get "/v1/events", params: { near: lido }
      preview = json["data"].first["sponsors_preview"]
      expect(preview.map { |row| row["name"] }).to eq(%w[First Second])
      expect(preview.map { |row| row["role"] }).to eq(%w[presented_by vendor])

      get "/v1/events/#{event.slug}"
      expect(json.dig("data", "sponsorships").map { |row| row.dig("sponsor", "name") }).to eq(%w[First Second Third])
      expect(json.dig("data", "sponsorships").map { |row| row["position"] }).to eq([ 1, 2, 3 ])
    end

    it "discovery AC-7: q matches by trigram but not from 100 km away" do
      create(:sponsor, name: "Lido Coffee", home_location: Geo.point(33.6172, -117.9270))
      create(:sponsor, name: "Inland Detailing", home_location: Geo.point(33.6172, -117.9270))

      get "/v1/sponsors", params: { q: "lido" }
      expect(json["data"].map { |row| row["name"] }).to eq([ "Lido Coffee" ])
      get "/v1/sponsors", params: { q: "lido", near: "32.7157,-117.1611" }
      expect(json["data"]).to eq([])
    end

    it "keeps a hidden sponsor's pages out of any shared cache and away from a suspended admin" do
      admin = create(:user, role: "admin")
      sponsor = create(:sponsor, :hidden)
      create_meet(:lido, host: sponsor)

      [ "/v1/sponsors/#{sponsor.slug}", "/v1/sponsors/#{sponsor.slug}/events" ].each do |path|
        get path, headers: auth(admin)
        expect(response).to have_http_status(:ok), "expected #{path} to be readable by an admin"
        expect(response.headers["Cache-Control"]).to include("no-store"), "expected #{path} to be no-store"
      end

      admin.update!(status: "suspended")
      get "/v1/sponsors/#{sponsor.slug}", headers: auth(admin)
      expect(response).to have_http_status(:not_found)
    end

    it "orders by followers without near and 404s an unknown slug" do
      create(:sponsor, name: "Few", followers_count: 2)
      create(:sponsor, name: "Most", followers_count: 40)

      get "/v1/sponsors"
      expect(json["data"].map { |row| row["name"] }).to eq(%w[Most Few])
      expect(json["data"].first["distance_m"]).to be_nil

      get "/v1/sponsors/no-such-sponsor"
      expect(response).to have_http_status(:not_found)
      get "/v1/sponsors/no-such-sponsor/events"
      expect(response).to have_http_status(:not_found)
    end
  end
end
