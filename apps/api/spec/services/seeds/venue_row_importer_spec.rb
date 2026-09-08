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

    # The first row owns the point, so a second run settles rather than
    # moving the lot back and forth between the two spellings.
    venue = Venue.sole
    expect(venue.name).to eq("Lido Marina Village")
    expect(venue.location.y).to be_within(0.000001).of(33.6172)

    expect(described_class.call(file.path).counts[:skip]).to eq(2)
    expect(Venue.count).to eq(1)
    expect(Venue.sole.location.y).to be_within(0.000001).of(33.6172)
  end

  it "corrects a lat and lng that a previous run got wrong (R-6)" do
    file = Tempfile.new([ "venues", ".csv" ])
    header = "name,address_line1,city,region,postal_code,country,lat,lng,timezone\n"
    file.write("#{header}Sierra at Foothill,17150 Foothill Blvd,Fontana,CA,92335,US,34.1065,-117.4356,America/Los_Angeles\n")
    file.flush
    described_class.call(file.path)

    fixed = Tempfile.new([ "venues", ".csv" ])
    fixed.write("#{header}Sierra at Foothill,17150 Foothill Blvd,Fontana,CA,92335,US,34.10655,-117.43565,America/Los_Angeles\n")
    fixed.flush

    report = described_class.call(fixed.path)
    expect(report.counts).to include(update: 1, create: 0)
    expect(Venue.sole.location.y).to be_within(0.000001).of(34.10655)
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
