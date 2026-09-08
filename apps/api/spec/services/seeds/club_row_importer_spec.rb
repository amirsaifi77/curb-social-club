require "rails_helper"

# clubs.csv (docs/specs/admin.md R-21).
RSpec.describe Seeds::ClubRowImporter, type: :service do
  include_context "with a seeded app account"

  it "creates three clubs owned by the app account and skips them on a re-run" do
    preview = described_class.call(fixture("clubs_3.csv"), dry_run: true)
    expect(preview.counts).to include(create: 3, error: 0)
    expect(Club.count).to eq(0)

    described_class.call(fixture("clubs_3.csv"))
    expect(Club.count).to eq(3)

    club = Club.find_by(slug: "back-bay-air-cooled")
    expect(club.name).to eq("Back Bay Air-Cooled")
    expect(club.owner).to eq(User.app_account)
    expect(club.verified).to be(true)
    expect(club.links).to eq("instagram" => "backbayaircooled", "website" => "https://backbay.example.com")
    expect(club.home_location.y).to be_within(0.0001).of(33.6172)
    expect(Club.find_by(slug: "inland-motors").join_policy).to eq("invite_only")

    second = described_class.call(fixture("clubs_3.csv"))
    expect(second.counts[:skip]).to eq(3)
    expect(Club.count).to eq(3)
  end

  it "reports a row whose owner_handle does not resolve" do
    file = Tempfile.new([ "clubs", ".csv" ])
    file.write(File.read(fixture("clubs_3.csv")).sub("https://backbay.example.com,", "https://backbay.example.com,nobody"))
    file.rewind

    report = described_class.call(file.path, dry_run: true)
    expect(report.counts[:error]).to eq(1)
    expect(report.rows.first.errors).to include("no user with handle nobody.")
  end
end
