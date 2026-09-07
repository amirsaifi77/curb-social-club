require "rails_helper"

RSpec.describe Recurrence::Schedule do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }
  let(:october) { zone.parse("2026-10-01 07:30") }

  def rule(text) = Recurrence::RruleValidator.parse(text)
  def dates(schedule, from, to) = schedule.occurrences_between(from, to).map { |t| t.in_time_zone(zone).to_date }

  it "translates every monthly ordinal R-4 allows for every weekday" do
    Recurrence::Schedule::DAYS.each do |code, _symbol|
      [ 1, 2, 3, 4, -1 ].each do |ordinal|
        schedule = described_class.build(dtstart: october, timezone: zone.name, rule: rule("FREQ=MONTHLY;BYDAY=#{ordinal}#{code}"))
        produced = dates(schedule, october, zone.parse("2026-10-31").end_of_day)
        weekday = Date.new(2026, 10, 1).step(Date.new(2026, 10, 31)).select { |d| d.strftime("%^a")[0, 2] == code }
        expected = ordinal.positive? ? weekday[ordinal - 1] : weekday.last
        expect(produced).to eq([ expected ]), "#{ordinal}#{code}: got #{produced.inspect}, expected #{expected}"
      end
    end
  end

  it "translates weekly day lists and intervals with Monday as the week start" do
    weekly = described_class.build(dtstart: zone.parse("2026-10-24 07:30"), timezone: zone.name, rule: rule("FREQ=WEEKLY;BYDAY=SA,SU"))
    expect(dates(weekly, zone.parse("2026-10-24"), zone.parse("2026-11-01").end_of_day).map(&:to_s))
      .to eq(%w[2026-10-24 2026-10-25 2026-10-31 2026-11-01])

    fortnightly = described_class.build(dtstart: zone.parse("2026-10-24 07:30"), timezone: zone.name, rule: rule("FREQ=WEEKLY;INTERVAL=2;BYDAY=SA,SU"))
    expect(dates(fortnightly, zone.parse("2026-10-24"), zone.parse("2026-11-15").end_of_day).map(&:to_s))
      .to eq(%w[2026-10-24 2026-10-25 2026-11-07 2026-11-08])

    every_day = described_class.build(dtstart: zone.parse("2026-10-19 07:30"), timezone: zone.name, rule: rule("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU"))
    expect(dates(every_day, zone.parse("2026-10-19"), zone.parse("2026-10-25").end_of_day).size).to eq(7)
  end

  it "starts at dtstart only when it matches the rule and keeps the local time across DST" do
    schedule = described_class.build(dtstart: zone.parse("2026-10-23 07:30"), timezone: zone.name, rule: rule("FREQ=WEEKLY;BYDAY=SA"))
    times = schedule.occurrences_between(zone.parse("2026-10-23"), zone.parse("2026-11-07").end_of_day)
    expect(times.map { |t| t.utc.iso8601 }).to eq(%w[2026-10-24T14:30:00Z 2026-10-31T14:30:00Z 2026-11-07T15:30:00Z])
  end

  it "builds from an event and rejects events without a valid rule" do
    event = build(:event, :monthly, dtstart: october, timezone: zone.name)
    expect(described_class.for(event)).to be_a(IceCube::Schedule)
    expect { described_class.for(build(:event, :announced)) }.to raise_error(ArgumentError)
  end
end
