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

  it "throttles POST /admin/session at 10 per minute per IP (admin.md AC-20)" do
    statuses = Array.new(11) do
      post "/admin/session", params: { credential: "x" }
      response.status
    end
    expect(statuses.first(10)).to all(eq(302))
    expect(statuses.last).to eq(429)
    expect(response.headers["Retry-After"]).to be_present
  end

  it "answers a throttled admin request in plain text, not the JSON envelope" do
    11.times { post "/admin/session", params: { credential: "x" } }
    expect(response).to have_http_status(:too_many_requests)
    expect(response.media_type).to eq("text/plain")
    expect(response.body).to eq("Too many requests. Try again shortly.")
  end

  it "declares the /admin and seed upload limits from admin.md R-11" do
    expect(Rack::Attack.throttles["admin/ip"]).to have_attributes(limit: 300, period: 60)
    expect(Rack::Attack.throttles["admin/seeds/ip"]).to have_attributes(limit: 10, period: 3600)
    expect(Rack::Attack.throttles["admin/session/ip"]).to have_attributes(limit: 10, period: 60)
  end
end
