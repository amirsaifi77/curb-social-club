require "swagger_helper"

RSpec.describe "v1/venues" do
  let(:lido) { "33.6172,-117.9270" }
  let(:provider_url) { %r{https://nominatim\.openstreetmap\.org/search} }

  def stub_provider(results)
    stub_request(:get, provider_url).to_return(
      status: 200, headers: { "Content-Type" => "application/json" }, body: results.to_json
    )
  end

  def nominatim_row(name, lat, lng, place_id)
    { "place_id" => place_id, "lat" => lat.to_s, "lon" => lng.to_s, "display_name" => name, "type" => "cafe" }
  end

  venue_search_schema = {
    type: :object,
    properties: {
      data: {
        type: :object,
        properties: {
          venues: { type: :array, maxItems: 5, items: { "$ref" => "#/components/schemas/Venue" } },
          suggestions: { type: :array, maxItems: 5, items: { "$ref" => "#/components/schemas/VenueSuggestion" } }
        },
        required: %w[venues suggestions]
      }
    },
    required: %w[data]
  }

  path "/v1/venues/search" do
    get "Search venues" do
      description "Venues we already have first, nearest first when near is present, then provider suggestions for places we do not (docs/api.md Venues). Provider results are cached for 24 hours per query, and a provider failure costs suggestions rather than the response."
      tags "Venues"
      produces "application/json"
      parameter name: :q, in: :query, required: true, schema: { type: :string }
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng"

      response "200", "existing venues before provider suggestions" do
        schema venue_search_schema
        let(:q) { "Back Bay Coffee" }
        let(:near) { lido }

        before do
          create(:venue, name: "Back Bay Coffee", location: Geo.point(33.6172, -117.9270))
          stub_provider([ nominatim_row("Back Bay Coffee Roasters, Newport Beach", 33.62, -117.93, 42) ])
        end

        run_test! do
          expect(json.dig("data", "venues").map { |row| row["name"] }).to eq([ "Back Bay Coffee" ])
          suggestion = json.dig("data", "suggestions").first
          expect(suggestion).to include("name" => "Back Bay Coffee Roasters", "external_place_id" => "42",
                                        "external_source" => "nominatim")
          expect(suggestion["lat"]).to be_within(0.001).of(33.62)
        end
      end

      response "400", "no q" do
        schema "$ref" => "#/components/schemas/Error"
        let(:q) { "" }
        run_test! { expect(json.dig("error", "message")).to eq("Send q to search venues.") }
      end
    end
  end

  describe "GET /v1/venues/search" do
    it "orders existing venues nearest first and caches the provider call for a day" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      create(:venue, name: "Back Bay Coffee", location: Geo.point(33.7071, -117.9270), city: "Far")
      create(:venue, name: "Back Bay Coffee", location: Geo.point(33.6202, -117.9270), city: "Near")
      stub_provider([ nominatim_row("Back Bay Coffee Roasters", 33.62, -117.93, 42) ])

      get "/v1/venues/search", params: { q: "back bay coffee", near: lido }
      expect(json.dig("data", "venues").map { |row| row["city"] }).to eq(%w[Near Far])
      expect(json.dig("data", "suggestions").size).to eq(1)

      get "/v1/venues/search", params: { q: "back bay coffee", near: lido }
      expect(json.dig("data", "suggestions").size).to eq(1)
      expect(a_request(:get, provider_url)).to have_been_made.once
    end

    it "keeps serving venues when the provider fails or is slow" do
      create(:venue, name: "Back Bay Coffee", location: Geo.point(33.6172, -117.9270))
      stub_request(:get, provider_url).to_timeout

      get "/v1/venues/search", params: { q: "back bay coffee" }
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "venues").size).to eq(1)
      expect(json.dig("data", "suggestions")).to eq([])
    end

    it "does not cache a provider outage, so the next search tries again" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      create(:venue, name: "Back Bay Coffee", location: Geo.point(33.6172, -117.9270))
      stub_request(:get, provider_url).to_timeout

      get "/v1/venues/search", params: { q: "back bay coffee" }
      expect(json.dig("data", "suggestions")).to eq([])

      stub_provider([ nominatim_row("Back Bay Coffee Roasters", 33.62, -117.93, 42) ])
      get "/v1/venues/search", params: { q: "back bay coffee" }
      expect(json.dig("data", "suggestions").map { |row| row["name"] }).to eq([ "Back Bay Coffee Roasters" ])
    end

    it "caches a genuinely empty result rather than asking again all day" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      stub_provider([])

      2.times { get "/v1/venues/search", params: { q: "nowhere at all" } }
      expect(json.dig("data", "suggestions")).to eq([])
      expect(a_request(:get, provider_url)).to have_been_made.once
    end

    it "skips the provider for a query too short to mean anything" do
      get "/v1/venues/search", params: { q: "ba" }
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "suggestions")).to eq([])
      expect(a_request(:get, provider_url)).not_to have_been_made
    end
  end
end
