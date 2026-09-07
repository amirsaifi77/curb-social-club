require "rails_helper"

# type: :request so AC-13 can assert that a drifted event still serves its
# page, which is the reason the job reports instead of hiding.
RSpec.describe HostConsistencyJob, type: :request do
  before { allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new) }

  it "AC-13 and sponsors AC-19: reports a deleted club and a hidden sponsor, and both events still serve (R-31, R-5)" do
    club = create(:club, name: "Gone Club")
    orphan = create_meet(:corona_del_mar, title: "Orphaned", host: club)
    hidden_sponsor = create(:sponsor, :hidden, name: "Hidden Sponsor")
    sponsored = create_meet(:lido, title: "Hidden host", host: hidden_sponsor)
    healthy = create_meet(:laguna_main_beach, title: "Healthy")
    # No FK on events.host_id by design (ADR 0010), so the row can vanish.
    ClubMembership.where(club_id: club.id).delete_all
    Club.where(id: club.id).delete_all

    report = described_class.perform_now

    expect(report[:missing]).to contain_exactly({ slug: orphan.slug, host_type: "Club", host_id: club.id })
    expect(report[:hidden]).to contain_exactly({ slug: sponsored.slug, host_type: "Sponsor", host_id: hidden_sponsor.id,
                                                 name: "Hidden Sponsor" })
    expect(report[:renamed]).to eq([])
    expect(report[:missing].map { |row| row[:slug] }).not_to include(healthy.slug)

    [ orphan, sponsored ].each do |event|
      get "/v1/events/#{event.slug}"
      expect(response).to have_http_status(:ok)
    end
    expect(json.dig("data", "host", "name")).to eq("Hidden Sponsor")
  end

  it "AC-12: reports zero after a rename, because the model callback already rewrote host_name (R-2)" do
    club = create(:club, name: "Back Bay Air-Cooled")
    create_meet(:corona_del_mar, host: club)
    create_meet(:lido, host: club)
    user = create(:user)
    user.profile.update!(display_name: "Ada")
    create_meet(:laguna_main_beach, host: user)

    club.update!(name: "Back Bay Air Cooled Society")
    user.profile.update!(display_name: "Ada Lovelace")

    report = described_class.perform_now
    expect(report).to include(missing: [], hidden: [], renamed: [])
  end

  it "rewrites host_name that drifted past the callbacks, for every host type" do
    club = create(:club, name: "Right Club")
    sponsor = create(:sponsor, name: "Right Sponsor")
    user = create(:user)
    user.profile.update!(display_name: "Right User")
    events = {
      club: create_meet(:corona_del_mar, host: club),
      sponsor: create_meet(:lido, host: sponsor),
      user: create_meet(:laguna_main_beach, host: user)
    }
    # A bulk write (the seed importer upserts) skips the model callbacks.
    Event.where(id: events.values.map(&:id)).update_all(host_name: "Stale name")

    report = described_class.perform_now

    expect(report[:renamed].map { |row| row[:to] }).to contain_exactly("Right Club", "Right Sponsor", "Right User")
    expect(report[:renamed].map { |row| row[:from] }.uniq).to eq([ "Stale name" ])
    expect(events.values.map { |event| event.reload.host_name }).to contain_exactly("Right Club", "Right Sponsor", "Right User")

    expect(described_class.perform_now[:renamed]).to eq([])
  end

  it "ignores drafts, caches the report for the dashboard, and logs a summary" do
    club = create(:club, :hidden)
    draft = create(:event, host: club)
    allow(Rails.logger).to receive(:info)

    report = described_class.perform_now

    expect(report[:hidden]).to eq([])
    expect(report[:missing]).to eq([])
    expect(draft.reload.host_name).to be_present
    expect(Rails.cache.read(described_class::REPORT_KEY)).to eq(report)
    expect(report[:generated_at]).to match(/\A\d{4}-\d{2}-\d{2}T/)
    expect(Rails.logger).to have_received(:info).with("HostConsistencyJob: 0 missing, 0 hidden, 0 host_name rewritten")
  end
end
