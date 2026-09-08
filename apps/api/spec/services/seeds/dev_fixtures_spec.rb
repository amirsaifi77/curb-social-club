require "rails_helper"

# docs/local-development.md. The rows in db/seeds/dev are the ones a person
# actually sees on a fresh database, so the file itself is under test, not a
# fixture copy of it.
RSpec.describe Seeds::DevFixtures, type: :service do
  let(:io) { StringIO.new }

  def run = described_class.call(io: io)

  it "imports every row in db/seeds/dev without an error" do
    reports = run

    expect(reports.sum { |report| report.counts[:error] }).to eq(0)
    expect(Sponsor.count).to eq(2)
    expect(Club.count).to eq(2)
    expect(Event.count).to eq(7)
  end

  it "creates the app account and the two people the club rows name" do
    run

    expect(User.app_account).to be_present
    expect(Profile.pluck(:handle)).to include("curb", "dev_ava", "dev_mateo")
    expect(Club.find_by(slug: "dev-harbor-motoring").memberships.count).to eq(2)
  end

  it "leaves every row listed and materializable, so the screens have content" do
    run
    MaterializeOccurrencesJob.perform_now

    expect(Event.listed.count).to eq(7)
    expect(EventOccurrence.where(starts_at: Time.current..).count).to be > 20
    expect(Event.stale).to be_empty
    expect(Event.decayable).to be_empty
  end

  # The whole reason the rows are templates: a fixed verified_date would age
  # every meet into staleness (R-25) and then dormancy (R-26).
  it "dates every meet against the day it runs, not the day it was written" do
    later = 200.days.from_now
    travel_to(later) { run }

    expect(Event.pluck(:verified_at).map(&:to_date).uniq).to eq([ later.to_date ])
    expect(Event.stale(later)).to be_empty
    # The one-off meet is still ahead of the run, not behind it.
    expect(Event.find_by(slug: "dev-pier-bowl-morning").dtstart).to be > later
  end

  it "re-runs clean, so a second seeding reports no change" do
    run
    second = StringIO.new
    reports = described_class.call(io: second)

    expect(reports.sum { |report| report.counts[:skip] }).to eq(11)
    expect(reports.sum { |report| report.counts[:create] + report.counts[:update] }).to eq(0)
  end

  # The reports cover only the CSV rows. People and memberships are written
  # outside them, so a second run demoting the club owner would go unreported.
  it "leaves the people and their memberships alone on a second run" do
    run
    owner = Club.find_by(slug: "dev-harbor-motoring").memberships.find_by(role: "owner")

    expect { described_class.call(io: StringIO.new) }.not_to change(User, :count)
    expect(owner.reload.role).to eq("owner")
    expect(ClubMembership.count).to eq(4)
  end

  it "marks every row as fabricated rather than verified" do
    run

    expect(Event.pluck(:slug)).to all(start_with("dev-"))
    expect(Event.pluck(:verification_source_url)).to all(include("example.invalid"))
    expect(Club.pluck(:slug) + Sponsor.pluck(:slug)).to all(start_with("dev-"))
    # A plausible handle would point at a real person's account.
    expect(Club.pluck(:links) + Sponsor.pluck(:links)).to all(satisfy { |links| links.except("website").empty? })
  end

  it "refuses to run in production" do
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))

    expect { run }.to raise_error(described_class::Refused, /production/)
    expect(Event.count).to eq(0)
  end

  # Rails.env alone would not stop DATABASE_URL pointing a development shell
  # at a deployed database, which is a command the setup doc teaches.
  it "refuses a database that is neither development nor test" do
    config = ActiveRecord::DatabaseConfigurations::HashConfig.new("development", "primary", database: "curb_prod")
    allow(ActiveRecord::Base).to receive(:connection_db_config).and_return(config)

    expect { run }.to raise_error(described_class::Refused, /curb_prod/)
    expect(Event.count).to eq(0)
  end

  describe "#clear" do
    it "removes every row it wrote, including the venues no prefix reaches" do
      run
      MaterializeOccurrencesJob.perform_now

      described_class.new(io: io).clear

      expect(Event.count).to eq(0)
      expect(Venue.count).to eq(0)
      expect(Club.count).to eq(0)
      expect(Sponsor.count).to eq(0)
      expect(EventOccurrence.count).to eq(0)
      expect(ClubMembership.count).to eq(0)
      expect(EventSponsorship.count).to eq(0)
      # The app account is not a fixture.
      expect(Profile.pluck(:handle)).to eq([ "curb" ])
    end

    # Venues::Deduper shares a lot between rows (events spec R-6), so one a
    # verified event has since attached to is not the fixtures' to delete.
    # Venue has dependent: :restrict_with_error, so it survives either way;
    # what the filter buys is an honest count, because destroy_all returns
    # the rows whose destroy was refused along with the rows it removed.
    it "keeps a venue another event still uses, and does not count it" do
      run
      shared = Event.find_by(slug: "dev-harbor-coffee-run").venue
      create(:event, venue: shared, slug: "verified-meet")

      counts = described_class.new(io: io).clear

      expect(Venue.exists?(shared.id)).to be(true)
      expect(Venue.count).to eq(1)
      expect(counts[:venues]).to eq(6)
      expect(io.string).to include("6 venues")
    end

    it "refuses in production, like the seeding does" do
      run
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))

      expect { described_class.new(io: io).clear }.to raise_error(described_class::Refused)
      expect(Event.count).to eq(7)
    end
  end
end
