require "rails_helper"

RSpec.describe Sponsor do
  it "validates slug, kind, status, tagline, description, and website (R-1)" do
    expect(build(:sponsor)).to be_valid
    expect(build(:sponsor, kind: "agency")).not_to be_valid
    expect(build(:sponsor, status: "paused")).not_to be_valid
    expect(build(:sponsor, tagline: "x" * 81)).not_to be_valid
    expect(build(:sponsor, description: "x" * 1001)).not_to be_valid
    expect(build(:sponsor, website: "example.com")).not_to be_valid
    expect(build(:sponsor, website: nil)).to be_valid
    expect(build(:sponsor, slug: "Bad Slug")).not_to be_valid
    create(:sponsor, slug: "harbor")
    expect(build(:sponsor, slug: "HARBOR")).not_to be_valid
  end

  it "AC-7: renaming the sponsor rewrites host_name on every hosted event (R-2)" do
    sponsor = create(:sponsor, name: "Harbor Coffee")
    hosted = create(:event, :published, host: sponsor)
    attached = create(:event, :published)
    create(:event_sponsorship, event: attached, sponsor: sponsor)

    sponsor.update!(name: "Harbor Coffee Roasters")

    expect(hosted.reload.host_name).to eq("Harbor Coffee Roasters")
    expect(attached.reload.host_name).not_to eq("Harbor Coffee Roasters")
  end

  it "AC-8: events_count goes 2, 3, 2 across attach and cancel (R-4)" do
    sponsor = create(:sponsor)
    hosted = create(:event, :published, host: sponsor)
    create(:event_sponsorship, event: create(:event, :published), sponsor: sponsor)
    expect(sponsor.reload.events_count).to eq(2)

    third = create(:event, host: create(:club))
    create(:event_sponsorship, event: third, sponsor: sponsor)
    expect(sponsor.reload.events_count).to eq(2)
    third.update!(status: "published")
    expect(sponsor.reload.events_count).to eq(3)

    hosted.update!(status: "cancelled")
    expect(sponsor.reload.events_count).to eq(2)
  end

  it "counts an event once when the sponsor both hosts and is attached, and drops it on detach or destroy" do
    sponsor = create(:sponsor)
    event = create(:event, :published, host: sponsor)
    sponsorship = create(:event_sponsorship, event: event, sponsor: sponsor)
    expect(sponsor.reload.events_count).to eq(1)

    sponsorship.destroy!
    expect(sponsor.reload.events_count).to eq(1)

    attached = create(:event, :published)
    create(:event_sponsorship, event: attached, sponsor: sponsor)
    expect(sponsor.reload.events_count).to eq(2)
    attached.destroy!
    expect(sponsor.reload.events_count).to eq(1)
  end

  it "AC-3 (model part): a hidden sponsor leaves the visible scope, its sponsorships are omitted, and it still hosts (R-5)" do
    sponsor = create(:sponsor, :hidden)
    hosted = create(:event, :published, host: sponsor)
    attached = create(:event, :published)
    create(:event_sponsorship, event: attached, sponsor: sponsor)
    visible = create(:event_sponsorship, event: attached, sponsor: create(:sponsor))

    expect(described_class.visible).not_to include(sponsor)
    expect(attached.sponsorships.with_visible_sponsor).to eq([ visible ])
    expect(hosted.reload.host).to eq(sponsor)
    expect(hosted.host_name).to eq(sponsor.name)
  end
end
