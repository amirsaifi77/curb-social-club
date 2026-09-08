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

    it "R-28: a lower verified_date does not move last_confirmed_at backwards" do
      before_value = Event.find_by(slug: "lido-saturday").last_confirmed_at
      rewritten = Tempfile.new([ "events", ".csv" ])
      rewritten.write(File.read(path).gsub("2026-09-05", "2026-07-01"))
      rewritten.rewind

      described_class.call(rewritten.path, dry_run: false)
      event = Event.find_by(slug: "lido-saturday")
      expect(event.last_confirmed_at).to eq(before_value)
      # verified_at follows the file, because it records when the check happened.
      expect(event.verified_at.in_time_zone("America/Los_Angeles").to_date).to eq(Date.new(2026, 7, 1))
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
