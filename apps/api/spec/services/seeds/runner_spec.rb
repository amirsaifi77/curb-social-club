require "rails_helper"

# docs/specs/events-and-occurrences.md R-32.
RSpec.describe Seeds::Runner, type: :service do
  def fixture(name) = Rails.root.join("spec/fixtures/seeds/#{name}").to_s

  before { create(:app_account) }

  describe ".import" do
    it "picks the importer from the file name and writes" do
      report = described_class.import(fixture("clubs_3.csv"), kind: "clubs")
      expect(report.kind).to eq("club")
      expect(report.counts[:create]).to eq(3)
      expect(Club.count).to eq(3)
    end

    it "writes nothing on a dry run" do
      described_class.import(fixture("clubs_3.csv"), kind: "clubs", dry_run: true)
      expect(Club.count).to eq(0)
    end

    it "refuses a path it cannot map to an importer" do
      expect { described_class.import("") }.to raise_error(described_class::Failure, /Usage/)
      expect { described_class.import("db/seeds/nope.csv") }.to raise_error(described_class::Failure, /No such file/)

      stray = Tempfile.new([ "whatever", ".csv" ])
      expect { described_class.import(stray.path) }.to raise_error(described_class::Failure, /Kind must be one of/)
      expect { described_class.import(stray.path, kind: "robots") }.to raise_error(described_class::Failure, /not robots/)
    end
  end

  describe ".import_all" do
    it "runs the files present in dependency order and says what is missing" do
      directory = Dir.mktmpdir
      FileUtils.cp(fixture("sponsors_2.csv"), File.join(directory, "sponsors.csv"))
      FileUtils.cp(fixture("clubs_3.csv"), File.join(directory, "clubs.csv"))
      FileUtils.cp(fixture("events_12_fixed.csv"), File.join(directory, "events.csv"))
      io = StringIO.new

      reports = described_class.import_all(directory: directory, io: io)

      expect(reports.map(&:kind)).to eq(%w[sponsor club event])
      expect(io.string).to include("venues.csv: not present, skipping")
      # Sponsors and clubs first, so the event rows that name them resolve.
      expect(Event.count).to eq(12)
      expect(Event.find_by(slug: "inland-unknown-host").sponsorships.count).to eq(2)
    end
  end
end
