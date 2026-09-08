# Shared setup and helpers for the seed importer specs (docs/specs/admin.md
# R-21, events spec R-29).
module SeedFixtures
  def seed_fixture(name) = Rails.root.join("spec/fixtures/seeds/#{name}")

  # The over-the-limit file is generated rather than committed: it is 500
  # copies of one row, and the only thing any spec asks of it is its size.
  def oversized_events_csv(rows: Seeds::BaseImporter::MAX_ROWS + 1)
    template = File.readlines(seed_fixture("events_12.csv"))
    file = Tempfile.new([ "events_oversized", ".csv" ])
    file.write(template.first)
    rows.times { |n| file.write(template[1].sub("lido-saturday", format("over-%03d", n))) }
    file.flush
    file
  end
end

RSpec.shared_context "with a seeded app account" do
  include SeedFixtures

  def fixture(name) = seed_fixture(name).to_s

  before { create(:app_account) }
end

RSpec.configure { |config| config.include SeedFixtures }
