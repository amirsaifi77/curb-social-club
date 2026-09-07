require "rails_helper"

RSpec.describe "rack-attack", type: :request do
  around do |example|
    Rack::Attack.enabled = true
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    example.run
  ensure
    Rack::Attack.enabled = false
  end

  it "throttles /auth/* at 10 per minute per IP with Retry-After (AC-13)" do
    statuses = Array.new(11) do
      post "/v1/auth/apple", params: { identity_token: "x", authorization_code: "y", nonce: "z" }, as: :json
      response.status
    end
    expect(statuses.first(10)).to all(eq(401))
    expect(statuses.last).to eq(429)
    expect(response.headers["Retry-After"]).to be_present
    expect(JSON.parse(response.body).dig("error", "code")).to eq("rate_limited")
  end
end
