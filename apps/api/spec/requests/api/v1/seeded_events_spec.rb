require "rails_helper"

# The seed check in docs/specs/events-and-occurrences.md Verification, run
# against the fixture file rather than db/seeds/events.csv, which carries
# its header and no rows until the verified meets are written.
RSpec.describe "seeded meets are readable", type: :request do
  let(:newport) { "33.6172,-117.9270" }
  let(:fontana) { "34.1065,-117.4356" }

  before do
    create(:app_account)
    create(:club, slug: "back-bay-air-cooled", name: "Back Bay Air-Cooled")
    create(:sponsor, slug: "bear-coast", name: "Bear Coast Coffee")
    create(:sponsor, slug: "apex-detail", name: "Apex Detail")
    # Inside the 30 day confirmation clock from the fixture's verified_date,
    # so a seeded meet reads as fresh rather than stale (events R-25).
    travel_to Time.zone.parse("2026-10-01 09:00")
    Seeds::EventRowImporter.call(Rails.root.join("spec/fixtures/seeds/events_12_fixed.csv").to_s)
    perform_enqueued_jobs
  end

  after { travel_back }

  it "AC-1 style: a browse from Newport Beach returns the coastal meets with dates" do
    # The fixture meets are late October, past the default 14 day window.
    get "/v1/events", params: { near: newport, radius_km: 32, to: "2026-11-05" }

    expect(response).to have_http_status(:ok)
    titles = json["data"].map { |row| row["title"] }
    expect(titles).to include("Lido Saturday", "Corona del Mar coffee", "Huntington pier meet")
    expect(titles).not_to include("Fontana Saturday")

    first = json["data"].first
    expect(first["next_occurrence"]).to be_present
    expect(first["distance_m"]).to be_a(Integer)
    expect(first["stale"]).to be(false)
  end

  it "AC-3 style: a browse from Fontana returns the Inland Empire meets" do
    get "/v1/events", params: { near: fontana, radius_km: 32, to: "2026-11-05" }

    titles = json["data"].map { |row| row["title"] }
    expect(titles).to include("Fontana Saturday", "Fontana Sunday")
    expect(titles).not_to include("Lido Saturday")
  end

  it "carries the seeded host, sponsors, and source through to the detail read" do
    get "/v1/events/inland-unknown-host"

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "host")).to include("type" => "club", "name" => "Back Bay Air-Cooled")
    expect(json.dig("data", "sponsorships").map { |row| [ row.dig("sponsor", "name"), row["role"] ] })
      .to eq([ [ "Bear Coast Coffee", "coffee" ], [ "Apex Detail", "partner" ] ])
    # verification_source_url is the builder's audit trail, not a public
    # field; the reader gets the organizer's own link as `source`.
    expect(json.dig("data", "source")).to include("url" => "https://example.com/inland-unknown-host")
    expect(Event.find_by(slug: "inland-unknown-host").verification_source_url).to be_present
  end

  it "materializes the recurring rows the importer enqueued" do
    weekly = Event.find_by(slug: "lido-saturday")
    expect(weekly.occurrences.scheduled.count).to be > 8
    expect(weekly.occurrences.chronological.first.starts_at.in_time_zone(weekly.timezone).strftime("%a %H:%M"))
      .to eq("Sat 07:30")
  end
end
