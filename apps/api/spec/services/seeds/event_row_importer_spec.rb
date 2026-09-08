require "rails_helper"

# docs/specs/events-and-occurrences.md R-28, R-29, R-30, R-6, AC-20, AC-21.
RSpec.describe Seeds::EventRowImporter, type: :service do
  subject(:report) { described_class.call(path, dry_run: dry_run) }

  let(:dry_run) { true }
  let(:path) { fixture("events_12.csv") }

  def fixture(name) = Rails.root.join("spec/fixtures/seeds/#{name}").to_s

  before do
    create(:app_account)
    create(:club, slug: "back-bay-air-cooled", name: "Back Bay Air-Cooled")
    create(:sponsor, slug: "bear-coast", name: "Bear Coast Coffee")
    create(:sponsor, slug: "apex-detail", name: "Apex Detail")
  end

  describe "AC-20: the dry run" do
    it "reports 10 create and 2 error with the row numbers and copy, and writes nothing" do
      expect { report }.not_to change(Event, :count)
      expect(Venue.count).to eq(0)

      expect(report.counts).to include(create: 10, error: 2, update: 0, skip: 0)
      errors = report.rows.select(&:error?)
      expect(errors.map(&:number)).to eq([ 11, 12 ])
      expect(errors.first.errors).to include(described_class::MISSING_VERIFICATION)
      expect(errors.last.errors).to include("no club with slug no-such-club.")
    end
  end

  describe "AC-20: applying the fixed file" do
    let(:path) { fixture("events_12_fixed.csv") }
    let(:dry_run) { false }

    it "writes 12 events with the verification stamps, the sponsorships, and one shared venue" do
      expect { report }.to change(Event, :count).by(12)
      expect(report.counts).to include(create: 12, error: 0)

      event = Event.find_by(slug: "lido-saturday")
      verified = Date.new(2026, 9, 5)
      expect(event.verified_at.in_time_zone("America/Los_Angeles").to_date).to eq(verified)
      expect(event.last_confirmed_at.in_time_zone("America/Los_Angeles").to_date).to eq(verified)
      expect(event.status).to eq("published")
      expect(event.host).to eq(User.app_account)

      # R-6: one row names the lot with a doubled space five metres away,
      # so Venues::Deduper gives every Lido row the same venue.
      lido = Venue.where("lower(name) LIKE '%lido%'").to_a
      expect(lido.size).to eq(1)
      expect(Event.where(venue: lido.first).pluck(:slug))
        .to match_array(%w[lido-saturday lido-sunday lido-second-lot newport-monthly])
      # Twelve rows, six real lots: Lido, Port Theater, Pier Plaza, Sierra
      # at Foothill, Victoria Gardens, Riverside Auto Center.
      expect(Venue.count).to eq(6)
      expect(Event.where(venue: Venue.find_by(name: "Sierra at Foothill")).count).to eq(3)

      sponsored = Event.find_by(slug: "inland-unknown-host")
      expect(sponsored.host).to eq(Club.find_by(slug: "back-bay-air-cooled"))
      expect(sponsored.sponsorships.ordered.map { |row| [ row.sponsor.slug, row.role ] })
        .to eq([ [ "bear-coast", "coffee" ], [ "apex-detail", "partner" ] ])
    end

    it "enqueues the materializer for each event it creates (R-10)" do
      expect { report }.to have_enqueued_job(MaterializeOccurrencesJob).exactly(12).times
    end
  end

  describe "AC-21: re-running the file" do
    let(:path) { fixture("events_12_fixed.csv") }

    before { described_class.call(path, dry_run: false) }

    it "reports every row skip and writes nothing the second time" do
      second = described_class.call(path, dry_run: false)
      expect(second.counts).to include(create: 0, update: 0, error: 0)
      expect(second.counts[:skip]).to eq(12)
      expect(Event.count).to eq(12)
    end

    it "reports one update when a title changes" do
      rewritten = Tempfile.new([ "events", ".csv" ])
      rewritten.write(File.read(path).sub("Lido Saturday", "Lido Saturday Meet"))
      rewritten.rewind

      second = described_class.call(rewritten.path, dry_run: false)
      expect(second.counts).to include(update: 1, skip: 11)
      expect(Event.find_by(slug: "lido-saturday").title).to eq("Lido Saturday Meet")
    end

    it "R-28: an older copy of the file moves neither stamp backwards, so every row is skip" do
      before_event = Event.find_by(slug: "lido-saturday")
      was_confirmed = before_event.last_confirmed_at
      was_verified = before_event.verified_at
      rewritten = Tempfile.new([ "events", ".csv" ])
      rewritten.write(File.read(path).gsub("2026-09-05", "2026-07-01"))
      rewritten.flush

      report = described_class.call(rewritten.path, dry_run: false)

      event = Event.find_by(slug: "lido-saturday")
      expect(event.last_confirmed_at).to eq(was_confirmed)
      expect(event.verified_at).to eq(was_verified)
      # Both stamps move forward only, so re-running an older file changes
      # nothing at all rather than reporting twelve updates.
      expect(report.counts).to include(update: 0, error: 0)
      expect(report.counts[:skip]).to eq(12)
    end

    it "AC-21: a title edit is the only update, even when another row carries an older date" do
      rewritten = Tempfile.new([ "events", ".csv" ])
      text = File.read(path).sub("Lido Saturday,", "Lido Saturday Meet,")
      # A different row, with a date behind the one already stored.
      rewritten.write(text.sub("Fontana Saturday,Coffee and cars in the lot.,,,Sierra at Foothill", "Fontana Saturday,Coffee and cars in the lot.,,,Sierra at Foothill")
                          .sub(",2026-09-05,\n", ",2026-07-01,\n"))
      rewritten.flush

      report = described_class.call(rewritten.path, dry_run: false)
      expect(report.counts).to include(update: 1, error: 0)
      expect(report.counts[:skip]).to eq(11)
    end

    it "R-29: a claimed event keeps its host, and the row says so" do
      event = Event.find_by(slug: "inland-unknown-host")
      claimed_host = create(:club, slug: "someone-else", name: "Someone Else")
      event.update!(host: claimed_host, claimed_at: 1.day.ago)

      second = described_class.call(path, dry_run: false)
      row = second.rows.find { |candidate| candidate.key == "inland-unknown-host" }
      expect(row.notes).to include(described_class::CLAIMED_NOTE)
      event.reload
      expect(event.host).to eq(claimed_host)
      expect(event.claimed_at).to be_present
    end
  end

  describe "validation the dry run has to catch" do
    let(:dry_run) { true }

    def two_rows(&edit)
      lines = File.readlines(fixture("events_12_fixed.csv"))
      file = Tempfile.new([ "events", ".csv" ])
      file.write(lines[0] + edit.call(lines[1]) + lines[2])
      file.flush
      file
    end

    it "reports a bad venue column, which the Event alone would never see" do
      file = two_rows { |line| line.sub(",US,", ",USA,") }

      preview = described_class.call(file.path, dry_run: true)
      expect(preview.counts).to include(create: 1, error: 1)
      expect(preview.rows.first.errors).to include("venue: Country must be an ISO 3166-1 alpha-2 code")

      # And the good row still lands, rather than the whole apply rolling back.
      described_class.call(file.path, dry_run: false)
      expect(Event.pluck(:slug)).to eq([ "lido-sunday" ])
    end

    it "reports a slug repeated inside one file, naming the row it clashes with" do
      lines = File.readlines(fixture("events_12_fixed.csv"))
      file = Tempfile.new([ "events", ".csv" ])
      file.write(lines[0] + lines[1] + lines[1])
      file.flush

      report = described_class.call(file.path, dry_run: true)
      expect(report.counts).to include(create: 1, error: 1)
      expect(report.rows.last.errors).to include("slug lido-saturday is already used by row 1 of this file.")

      described_class.call(file.path, dry_run: false)
      expect(Event.count).to eq(1)
    end

    it "reports a source_url repeated inside one file" do
      file = two_rows { |line| line }
      lines = File.readlines(fixture("events_12_fixed.csv"))
      repeated = Tempfile.new([ "events", ".csv" ])
      repeated.write(lines[0] + lines[1] + lines[2].sub("https://example.com/lido-sunday", "https://example.com/lido-saturday"))
      repeated.flush

      report = described_class.call(repeated.path, dry_run: true)
      expect(report.rows.last.errors.first).to include("source_url", "row 1")
      expect(file).to be_present
    end

    it "reads a file with an accent and a byte order mark, which is what a spreadsheet exports" do
      lines = File.readlines(fixture("events_12_fixed.csv"))
      file = Tempfile.new([ "events", ".csv" ])
      file.binmode
      file.write("\xEF\xBB\xBF".b + (lines[0] + lines[1].sub("Lido Marina Village", "Café Lido")).b)
      file.flush

      report = described_class.call(file.path, dry_run: false)
      expect(report.counts).to include(create: 1, error: 0)
      expect(Venue.sole.name).to eq("Café Lido")
    end

    it "says the file is unreadable rather than raising on a malformed quote" do
      file = Tempfile.new([ "events", ".csv" ])
      file.write(File.readlines(fixture("events_12_fixed.csv"))[0] + %(a,"unclosed\n))
      file.flush

      expect { described_class.call(file.path, dry_run: true) }
        .to raise_error(Seeds::BaseImporter::Unreadable, /not readable as CSV/)
    end
  end

  describe "corrections to an event that already exists" do
    let(:path) { fixture("events_12_fixed.csv") }

    before { described_class.call(path, dry_run: false) }

    it "R-6: moves the venue when the row fixes its lat and lng, and says so" do
      lines = File.readlines(path)
      file = Tempfile.new([ "events", ".csv" ])
      file.write(lines[0] + lines[1].sub("33.6172,-117.9270", "33.6000,-117.9000"))
      file.flush

      report = described_class.call(file.path, dry_run: false)

      expect(report.counts).to include(update: 1)
      expect(report.rows.first.notes.join).to include("venue:")
      venue = Event.find_by(slug: "lido-saturday").venue
      expect(venue.location.y).to be_within(0.0001).of(33.6000)
    end

    it "R-29: emptying the sponsors column detaches, and the row says update" do
      lines = File.readlines(path)
      file = Tempfile.new([ "events", ".csv" ])
      file.write(lines[0] + lines[12].sub("bear-coast:coffee|apex-detail:partner", ""))
      file.flush

      report = described_class.call(file.path, dry_run: false)

      expect(report.counts).to include(update: 1, skip: 0)
      expect(Event.find_by(slug: "inland-unknown-host").sponsorships).to be_empty
    end
  end

  describe "row validation" do
    let(:path) { fixture("events_bad_rrule.csv") }

    it "AC-13: reports the events spec message for an rrule that is not a rule" do
      expect(report.counts).to include(create: 1, error: 1)
      expect(report.rows.last.errors).to include(Recurrence::RruleValidator::MESSAGE)
    end

    it "refuses a file over the row limit" do
      expect { described_class.call(oversized_events_csv.path, dry_run: true) }
        .to raise_error(Seeds::BaseImporter::TooManyRows, Seeds::BaseImporter::TOO_MANY_ROWS)
    end

    it "accepts a file at exactly the limit" do
      file = oversized_events_csv(rows: Seeds::BaseImporter::MAX_ROWS)
      expect { described_class.call(file.path, dry_run: true) }.not_to raise_error
    end
  end
end
