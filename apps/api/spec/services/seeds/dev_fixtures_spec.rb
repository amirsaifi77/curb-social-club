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
end
