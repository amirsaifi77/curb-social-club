require "rails_helper"

# type: :request so the AC can assert the list, map, and detail behaviour
# of a dormant event end to end, which is the point of R-27.
RSpec.describe SeedDecayJob, type: :request do
  let(:lido) { "33.6172,-117.9270" }

  it "AC-17: only the event unconfirmed for 90 days goes dormant, leaves the lists, and keeps its page (R-26, R-27)" do
    old = create_meet(:corona_del_mar, title: "Ninety-one days", last_confirmed_at: 91.days.ago)
    recent = create_meet(:huntington_beach_pier, title: "Eighty-nine days", last_confirmed_at: 89.days.ago)
    occurrence_ids = old.occurrences.pluck(:id, :status, :starts_at)

    described_class.perform_now

    expect(old.reload.dormant_at).to be_within(5.seconds).of(Time.current)
    expect(recent.reload.dormant_at).to be_nil

    get "/v1/events", params: { near: lido, radius_km: 160 }
    expect(data_titles).to eq([ "Eighty-nine days" ])
    get "/v1/events/map", params: { bbox: "-118.05,33.40,-117.60,33.70" }
    expect(json["data"].map { |pin| pin["title"] }).to eq([ "Eighty-nine days" ])

    get "/v1/events/#{old.slug}"
    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "dormant")).to be(true)
    expect(old.occurrences.pluck(:id, :status, :starts_at)).to eq(occurrence_ids)
  end

  it "never decays a claimed event, a draft, or an already dormant one, and is idempotent (R-26)" do
    claimed = create_meet(:corona_del_mar, title: "Claimed", claimed_at: 300.days.ago, last_confirmed_at: 200.days.ago)
    draft = create(:event, title: "Draft", published_at: 200.days.ago)
    already = create_meet(:lido, title: "Already dormant", last_confirmed_at: 200.days.ago, dormant_at: 10.days.ago)
    was_dormant_at = already.reload.dormant_at
    fresh = create_meet(:laguna_main_beach, title: "Fresh", last_confirmed_at: 1.day.ago)

    expect(described_class.perform_now).to eq([])
    expect(claimed.reload.dormant_at).to be_nil
    expect(draft.reload.dormant_at).to be_nil
    expect(already.reload.dormant_at).to eq(was_dormant_at)
    expect(fresh.reload.dormant_at).to be_nil
  end

  it "falls back to published_at and then created_at, logs the count and slugs, and returns them" do
    never_confirmed = create_meet(:corona_del_mar, title: "Never confirmed", last_confirmed_at: nil)
    never_confirmed.update_columns(published_at: 120.days.ago)
    no_stamps = create_meet(:lido, title: "No stamps", last_confirmed_at: nil)
    no_stamps.update_columns(published_at: nil, created_at: 200.days.ago)
    allow(Rails.logger).to receive(:info)

    slugs = described_class.perform_now

    expect(slugs).to contain_exactly(never_confirmed.slug, no_stamps.slug)
    expect(Rails.logger).to have_received(:info).with(/SeedDecayJob: 2 events went dormant: /)

    allow(Rails.logger).to receive(:info)
    expect(described_class.perform_now).to eq([])
    expect(Rails.logger).to have_received(:info).with("SeedDecayJob: 0 events went dormant")
  end
end
