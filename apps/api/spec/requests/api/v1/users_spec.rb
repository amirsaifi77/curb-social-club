require "swagger_helper"

RSpec.describe "v1/users" do
  event_list_schema = {
    type: :object,
    properties: {
      data: { type: :array, items: { "$ref" => "#/components/schemas/EventSummary" } },
      meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
    },
    required: %w[data meta]
  }

  let(:user) { create(:user) }

  path "/v1/users/{handle}" do
    get "Public profile" do
      description "The Profile shape (R-7, R-8). Anonymous by default; a suspended or deleted account is 404."
      tags "Users"
      produces "application/json"
      parameter name: :handle, in: :path, schema: { type: :string }

      response "200", "AC-1: a host with a club membership and three published meets" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Profile" } }, required: %w[data]
        let!(:profile) do
          record = user.profile
          record.update!(display_name: "Ada", bio: "Air-cooled only", is_host: true,
                         links: { "instagram" => "back.bay", "website" => "https://backbay.coffee" })
          club = create(:club, name: "Back Bay Air-Cooled")
          create(:club_membership, :admin, club: club, user: user)
          3.times { |i| create_meet(:corona_del_mar, title: "Meet #{i}", host: user) }
          create(:event, host: user, title: "Draft meet")
          record
        end
        let(:handle) { profile.handle }

        run_test! do
          data = json["data"]
          expect(data).to include("handle" => profile.handle, "display_name" => "Ada", "is_host" => true)
          expect(data["links"]).to eq({ "instagram" => "back.bay", "website" => "https://backbay.coffee" })
          expect(data["clubs"].size).to eq(1)
          expect(data["clubs"].first).to include("name" => "Back Bay Air-Cooled", "role" => "admin")
          expect(data["counts"]).to eq({ "followers" => 0, "following" => 0, "events_hosted" => 3,
                                         "vehicles" => 0, "posts" => 0 })
          expect(data["viewer"]).to eq({ "following" => false, "blocked" => false, "is_self" => false, "reported" => false })
        end
      end

      response "404", "AC-2: a suspended account" do
        schema "$ref" => "#/components/schemas/Error"
        let(:handle) { create(:user, :suspended).profile.handle }
        run_test!
      end
    end
  end

  path "/v1/users/{handle}/events" do
    get "Meets a user hosts" do
      description "Published events with host_type User, upcoming first."
      tags "Users"
      produces "application/json"
      parameter name: :handle, in: :path, schema: { type: :string }
      parameter name: :past, in: :query, required: false, schema: { type: :boolean }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "200", "hosted meets" do
        schema event_list_schema
        let!(:hosted) { create_meet(:corona_del_mar, title: "Hosted meet", host: user) }
        let(:handle) { user.profile.handle }

        run_test! { expect(json["data"].map { |row| row["title"] }).to eq([ "Hosted meet" ]) }
      end
    end
  end

  path "/v1/users/{handle}/clubs" do
    get "Clubs a user belongs to" do
      description "ClubSummary rows for active memberships, each with the member's role. Hidden clubs are omitted."
      tags "Users"
      produces "application/json"
      parameter name: :handle, in: :path, schema: { type: :string }

      response "200", "active memberships" do
        schema type: :object,
               properties: {
                 data: { type: :array, items: { "$ref" => "#/components/schemas/ClubSummary" } },
                 meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
               },
               required: %w[data meta]
        let!(:membership) { create(:club_membership, club: create(:club, name: "Back Bay Air-Cooled"), user: user) }
        let(:handle) { user.profile.handle }

        run_test! do
          expect(json["data"].map { |row| row["name"] }).to eq([ "Back Bay Air-Cooled" ])
          expect(json["data"].first["role"]).to eq("member")
        end
      end
    end
  end

  describe "profile reads" do
    it "AC-2: a deleted account is 404 on every profile route, and an unknown handle too" do
      deleted = create(:user, :deleted)
      handle = deleted.profile.handle

      [ "/v1/users/#{handle}", "/v1/users/#{handle}/events", "/v1/users/#{handle}/clubs", "/v1/users/nobody" ].each do |path|
        get path
        expect(response).to have_http_status(:not_found), "expected #{path} to be 404"
      end
    end

    it "is anonymous, case-insensitive on the handle, and marks the viewer as self when signed in" do
      user.profile.update!(handle: "ada_lovelace")

      get "/v1/users/ADA_LOVELACE"
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "viewer", "is_self")).to be(false)
      expect(response.headers["Cache-Control"]).to include("public", "max-age=30")

      get "/v1/users/ada_lovelace", headers: auth(user)
      expect(json.dig("data", "viewer", "is_self")).to be(true)
      expect(response.headers["Cache-Control"]).to include("no-store")
    end

    it "lists published hosted events and active club memberships only" do
      published = create_meet(:corona_del_mar, title: "Published", host: user)
      create(:event, host: user, title: "Draft")
      create_meet(:lido, title: "Someone else's")
      club = create(:club, name: "Active Club")
      create(:club_membership, club: club, user: user)
      create(:club_membership, :invited, club: create(:club, name: "Invited Club"), user: user)
      create(:club_membership, club: create(:club, :hidden, name: "Hidden Club"), user: user)

      get "/v1/users/#{user.profile.handle}/events"
      expect(data_titles).to eq([ "Published" ])
      expect(json["data"].first["id"]).to eq(published.id)

      get "/v1/users/#{user.profile.handle}/clubs"
      expect(json["data"].map { |row| row["name"] }).to eq([ "Active Club" ])
      expect(json["data"].first["role"]).to eq("member")

      get "/v1/users/#{user.profile.handle}"
      expect(json.dig("data", "clubs").map { |row| row["name"] }).to eq([ "Active Club" ])
    end
  end
end
