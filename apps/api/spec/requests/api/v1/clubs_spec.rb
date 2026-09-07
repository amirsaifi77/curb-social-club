require "swagger_helper"

RSpec.describe "v1/clubs" do
  let(:lido) { "33.6172,-117.9270" }

  it_behaves_like "anonymous-allowed", "/v1/clubs"


  event_list_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/EventSummary" } },
      meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
    },
    required: %w[data meta]
  }

  club_list_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/ClubSummary" } },
      meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
    },
    required: %w[data meta]
  }

  path "/v1/clubs/{slug}" do
    get "Club detail" do
      description "The Club shape. Anonymous by default; a hidden club is 404 unless the viewer can manage it (R-5, R-6, R-9)."
      tags "Clubs"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }

      response "200", "AC-1: an active club with three upcoming meets" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Club" } }, required: %w[data]
        let!(:club) do
          record = create(:club, name: "Back Bay Air-Cooled", description: "Air-cooled Porsches, most Saturdays.")
          3.times { |i| create_meet(:corona_del_mar, title: "Meet #{i}", host: record, starts_at: GeoFixtures.next_saturday_0730 + i.days) }
          create(:club_membership, club: record)
          record
        end
        let(:slug) { club.slug }

        run_test! do
          data = json["data"]
          expect(data).to include("slug" => club.slug, "name" => "Back Bay Air-Cooled", "join_policy" => "open",
                                  "members_count" => 2, "events_count" => 3, "distance_m" => nil, "role" => nil)
          expect(data["upcoming_events"].size).to eq(3)
          expect(data["upcoming_events"].first).to include("slug" => be_a(String), "next_occurrence" => be_a(Hash))
          expect(data["members_preview"].size).to eq(2)
          expect(data["members_preview"].first.keys).to contain_exactly("id", "handle", "display_name", "avatar_url")
          expect(data["viewer"]).to eq({ "following" => false, "membership" => nil, "can_manage" => false })
        end
      end

      response "404", "AC-2: a hidden club" do
        schema "$ref" => "#/components/schemas/Error"
        let(:slug) { create(:club, :hidden).slug }
        run_test!
      end
    end
  end

  path "/v1/clubs" do
    get "Club directory" do
      description "Active clubs, nearest first with distance_m when near is present, most followed first otherwise. q matches the name by trigram, within 80 km when near is present (R-7, R-18)."
      tags "Clubs"
      produces "application/json"
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng"
      parameter name: :radius_km, in: :query, required: false, schema: { type: :number }
      parameter name: :q, in: :query, required: false, schema: { type: :string }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "AC-3: clubs at 2 and 10 km, ordered, with distance_m" do
        schema club_list_schema
        let(:near) { lido }
        let(:radius_km) { 40 }
        let!(:clubs) do
          create(:club, name: "Two km", home_location: Geo.point(33.6352, -117.9270))
          create(:club, name: "Ten km", home_location: Geo.point(33.7071, -117.9270))
          create(:club, name: "Sixty km", home_location: Geo.point(34.1572, -117.9270))
        end

        run_test! do
          expect(json["data"].map { |row| row["name"] }).to eq([ "Two km", "Ten km" ])
          distances = json["data"].map { |row| row["distance_m"] }
          expect(distances).to all(be_a(Integer))
          expect(distances.first).to be_between(1_800, 2_200)
          expect(distances).to eq(distances.sort)
        end
      end
    end
  end

  path "/v1/clubs/{slug}/events" do
    get "Meets a club hosts" do
      description "EventSummary rows, upcoming first, or the most recent past meets with past=true."
      tags "Clubs"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }
      parameter name: :past, in: :query, required: false, schema: { type: :boolean }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "upcoming meets" do
        schema event_list_schema
        let!(:club) do
          record = create(:club)
          create_meet(:corona_del_mar, title: "Club meet", host: record)
          record
        end
        let(:slug) { club.slug }

        run_test! { expect(json["data"].map { |row| row["title"] }).to eq([ "Club meet" ]) }
      end
    end
  end

  path "/v1/clubs/{slug}/members" do
    get "Club members" do
      description "Active memberships only, oldest first, each with the member's role, cursor paginated. Blocked members are omitted for a signed-in viewer (R-8)."
      tags "Clubs"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "active members with roles" do
        schema type: :object,
               properties: {
                 data: {
                   type: :array,
                   items: {
                     allOf: [
                       { "$ref" => "#/components/schemas/MiniProfile" },
                       { type: :object, properties: { role: { type: :string, enum: ClubMembership::ROLES } }, required: %w[role] }
                     ]
                   }
                 },
                 meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
               },
               required: %w[data meta]
        let!(:club) { create(:club) }
        let(:slug) { club.slug }

        run_test! { expect(json["data"].map { |row| row["role"] }).to eq([ "owner" ]) }
      end
    end
  end

  path "/v1/clubs/{id}/membership" do
    put "Join a club" do
      description "Post-launch (R-10). Returns 403 not_enabled while clubs_self_service is off."
      tags "Clubs"
      produces "application/json"
      security [ { bearer: [] } ]
      parameter name: :id, in: :path, schema: { type: :string, format: :uuid }

      response "403", "AC-7: clubs_self_service is off" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { "Bearer #{Auth::SessionIssuer.issue(create(:user)).token}" }
        let(:id) { create(:club).id }

        run_test! do
          expect(json["error"]).to include("code" => "not_enabled")
          expect(json.dig("error", "message")).to eq(HostPages::CLUBS_NOT_ENABLED)
        end
      end
    end
  end

  describe "club reads" do
    it "AC-2: a hidden club vanishes from the directory but keeps hosting its event (R-5)" do
      hidden = create(:club, :hidden, name: "Hidden Club")
      event = create_meet(:corona_del_mar, host: hidden)
      create(:club, name: "Visible Club")

      get "/v1/clubs"
      expect(json["data"].map { |row| row["name"] }).to eq([ "Visible Club" ])

      get "/v1/events/#{event.slug}"
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "host")).to include("type" => "club", "name" => "Hidden Club")
    end

    it "shows a hidden club to a manager and to an admin, with the viewer block filled in" do
      owner = create(:user)
      club = create(:club, :hidden, owner: owner)
      admin = create(:user, role: "admin")

      get "/v1/clubs/#{club.slug}", headers: auth(owner)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "viewer")).to eq({ "following" => false, "can_manage" => true,
                                                 "membership" => { "role" => "owner", "status" => "active" } })
      expect(response.headers["Cache-Control"]).to include("no-store")

      get "/v1/clubs/#{club.slug}", headers: auth(admin)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "viewer", "can_manage")).to be(true)
    end

    it "orders by followers without near and pages with a cursor" do
      create(:club, name: "Few", followers_count: 1)
      create(:club, name: "Most", followers_count: 30)
      create(:club, name: "Some", followers_count: 10)

      get "/v1/clubs", params: { limit: 2 }
      expect(json["data"].map { |row| row["name"] }).to eq(%w[Most Some])
      get "/v1/clubs", params: { limit: 2, cursor: json.dig("meta", "next_cursor") }
      expect(json["data"].map { |row| row["name"] }).to eq(%w[Few])
      expect(json.dig("meta", "next_cursor")).to be_nil

      get "/v1/clubs", params: { cursor: "nope" }
      expect(response).to have_http_status(:bad_request)
    end

    it "discovery AC-7: q matches by trigram but not from 100 km away" do
      create(:club, name: "Back Bay Air-Cooled", home_location: Geo.point(33.6172, -117.9270))
      create(:club, name: "Inland Cruisers", home_location: Geo.point(33.6172, -117.9270))

      get "/v1/clubs", params: { q: "back bay" }
      expect(json["data"].map { |row| row["name"] }).to eq([ "Back Bay Air-Cooled" ])

      get "/v1/clubs", params: { q: "back bay", near: "32.7157,-117.1611" }
      expect(json["data"]).to eq([])
    end

    it "lists a club's meets, upcoming first and past with past=true" do
      club = create(:club)
      upcoming = create_meet(:corona_del_mar, title: "Upcoming", host: club)
      past_event = create_meet(:lido, title: "Past", host: club)
      past_event.occurrences.update_all(starts_at: 30.days.ago, ends_at: 30.days.ago + 2.hours)
      create_meet(:laguna_main_beach, title: "Someone else's")

      get "/v1/clubs/#{club.slug}/events"
      expect(data_titles).to eq([ "Upcoming" ])
      expect(json["data"].first["id"]).to eq(upcoming.id)

      get "/v1/clubs/#{club.slug}/events", params: { past: "true" }
      expect(data_titles).to eq([ "Past" ])

      get "/v1/clubs/no-such-club/events"
      expect(response).to have_http_status(:not_found)
    end

    it "lists active members only with their roles, paginated" do
      owner = create(:user)
      club = create(:club, owner: owner)
      member = create(:club_membership, club: club).user
      create(:club_membership, :invited, club: club)

      get "/v1/clubs/#{club.slug}/members"
      expect(json["data"].map { |row| row["role"] }).to eq(%w[owner member])
      expect(json["data"].map { |row| row["handle"] }).to eq([ owner.profile.handle, member.profile.handle ])
      expect(json["data"].first.keys).to contain_exactly("id", "handle", "display_name", "avatar_url", "role")

      get "/v1/clubs/#{club.slug}/members", params: { limit: 1 }
      expect(json["data"].size).to eq(1)
      get "/v1/clubs/#{club.slug}/members", params: { limit: 1, cursor: json.dig("meta", "next_cursor") }
      expect(json["data"].map { |row| row["role"] }).to eq(%w[member])
      expect(json.dig("meta", "next_cursor")).to be_nil
    end

    it "AC-7: every Phase 7 write answers 403 not_enabled while the flag is off (R-10)" do
      club = create(:club)
      user = create(:user)
      headers = auth(user)
      writes = [
        [ :post, "/v1/clubs" ],
        [ :patch, "/v1/clubs/#{club.id}" ],
        [ :put, "/v1/clubs/#{club.id}/membership" ],
        [ :delete, "/v1/clubs/#{club.id}/membership" ],
        [ :post, "/v1/clubs/#{club.id}/invites" ],
        [ :post, "/v1/clubs/#{club.id}/invite_code" ],
        [ :patch, "/v1/clubs/#{club.id}/members/#{user.id}" ],
        [ :delete, "/v1/clubs/#{club.id}/members/#{user.id}" ]
      ]

      writes.each do |verb, path|
        public_send(verb, path, headers: headers)
        expect(response).to have_http_status(:forbidden), "expected #{verb.upcase} #{path} to be 403"
        expect(json.dig("error", "code")).to eq("not_enabled")
        expect(response.headers["Cache-Control"]).to include("no-store")
      end
    end
  end
end
