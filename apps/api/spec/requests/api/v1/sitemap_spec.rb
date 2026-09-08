require "swagger_helper"

RSpec.describe "v1/sitemap" do
  it_behaves_like "anonymous-allowed", "/v1/sitemap"

  sitemap_schema = {
    type: :object,
    properties: {
      events: { type: :array, items: { type: :object, properties: { slug: { type: :string }, updated_at: { type: :string, format: "date-time" } }, required: %w[slug updated_at] } },
      clubs: { type: :array, items: { type: :object, properties: { slug: { type: :string }, updated_at: { type: :string, format: "date-time" } }, required: %w[slug updated_at] } },
      sponsors: { type: :array, items: { type: :object, properties: { slug: { type: :string }, updated_at: { type: :string, format: "date-time" } }, required: %w[slug updated_at] } },
      spots: { type: :array, items: { type: :object, additionalProperties: true } }
    },
    required: %w[events clubs sponsors spots]
  }

  path "/v1/sitemap" do
    get "Slugs for the web sitemap" do
      description "Public, non-hidden, non-dormant rows (web.md R-4): published events with an upcoming scheduled occurrence, active clubs, active sponsors. Spots arrive in Phase 4. Cached for an hour."
      tags "System"
      produces "application/json"

      response "200", "slugs and timestamps" do
        schema sitemap_schema

        before do
          create_meet(:corona_del_mar, title: "Listed meet")
          create(:club, name: "Active Club")
          create(:sponsor, name: "Active Sponsor")
        end

        run_test! do
          expect(json["events"].size).to eq(1)
          expect(json["events"].first.keys).to contain_exactly("slug", "updated_at")
          expect(json["clubs"].size).to eq(1)
          expect(json["sponsors"].size).to eq(1)
          expect(json["spots"]).to eq([])
        end
      end
    end
  end

  describe "GET /v1/sitemap" do
    it "leaves out drafts, unlisted, hidden, dormant, and past-only events, and hidden hosts" do
      listed = create_meet(:corona_del_mar, title: "Listed")
      create_meet(:corona_del_mar, title: "Unlisted", visibility: "unlisted")
      create_meet(:corona_del_mar, title: "Dormant", dormant_at: Time.current)
      create(:event, title: "Draft")
      past = create_meet(:lido, title: "Past only")
      past.occurrences.update_all(starts_at: 30.days.ago, ends_at: 30.days.ago + 2.hours)
      create(:club, :hidden, name: "Hidden Club")
      create(:sponsor, :hidden, name: "Hidden Sponsor")
      visible_club = create(:club, name: "Visible Club")

      get "/v1/sitemap"
      expect(json["events"].map { |row| row["slug"] }).to eq([ listed.slug ])
      expect(json["clubs"].map { |row| row["slug"] }).to eq([ visible_club.slug ])
      expect(json["sponsors"]).to eq([])
    end

    it "is cached for an hour and sends a public cache header" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      create_meet(:corona_del_mar, title: "First")

      get "/v1/sitemap"
      expect(json["events"].size).to eq(1)
      expect(response.headers["Cache-Control"]).to include("public", "max-age=3600")

      create_meet(:lido, title: "Second")
      get "/v1/sitemap"
      expect(json["events"].size).to eq(1)

      travel 61.minutes do
        get "/v1/sitemap"
        expect(json["events"].size).to eq(2)
      end
    end
  end
end
