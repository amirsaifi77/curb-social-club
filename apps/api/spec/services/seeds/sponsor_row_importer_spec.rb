require "rails_helper"

# sponsors.csv (docs/specs/admin.md R-21).
RSpec.describe Seeds::SponsorRowImporter, type: :service do
  include_context "with a seeded app account"

  it "creates two sponsors and skips them on a re-run" do
    expect(described_class.call(fixture("sponsors_2.csv"), dry_run: true).counts).to include(create: 2, error: 0)
    expect(Sponsor.count).to eq(0)

    described_class.call(fixture("sponsors_2.csv"))
    sponsor = Sponsor.find_by(slug: "bear-coast")
    expect(sponsor.kind).to eq("vendor")
    expect(sponsor.verified).to be(true)
    expect(sponsor.website).to eq("https://bearcoast.example.com")
    expect(described_class.call(fixture("sponsors_2.csv")).counts[:skip]).to eq(2)
  end
end
