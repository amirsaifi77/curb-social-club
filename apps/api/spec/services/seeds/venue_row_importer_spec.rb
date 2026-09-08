require "rails_helper"

# venues.csv (docs/specs/admin.md R-21).
RSpec.describe Seeds::VenueRowImporter, type: :service do
  include_context "with a seeded app account"

  it "keys on the normalized name within 100 m, so a second run is all skip" do
    file = Tempfile.new([ "venues", ".csv" ])
    file.write("name,address_line1,city,region,postal_code,country,lat,lng,timezone\n" \
               "Lido Marina Village,3636 Newport Blvd,Newport Beach,CA,92663,US,33.6172,-117.9270,America/Los_Angeles\n" \
               "Lido  Marina Village,3636 Newport Blvd,Newport Beach,CA,92663,US,33.61725,-117.92705,America/Los_Angeles\n")
    file.rewind

    report = described_class.call(file.path)
    # The plan is made against the table as it was, so the second row can
    # only be seen as a duplicate once the first is written. The write
    # collapses them and the report is corrected to say so.
    expect(Venue.count).to eq(1)
    expect(report.counts).to include(create: 1, skip: 1, error: 0)
    expect(report.rows.last.notes).to include("same lot as an earlier row in this file.")

    expect(described_class.call(file.path).counts[:skip]).to eq(2)
    expect(Venue.count).to eq(1)
  end

  it "reports a row with no coordinates" do
    file = Tempfile.new([ "venues", ".csv" ])
    file.write("name,address_line1,city,region,postal_code,country,lat,lng\nNowhere,,Fontana,CA,92335,US,,\n")
    file.rewind

    report = described_class.call(file.path, dry_run: true)
    expect(report.counts[:error]).to eq(1)
    expect(report.rows.first.errors).to include("lat is required.", "lng is required.")
  end
end
