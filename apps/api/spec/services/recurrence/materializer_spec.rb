require "rails_helper"

RSpec.describe Recurrence::Materializer do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }
  let(:venue) { create(:venue, :coastal) }

  def local(text) = zone.parse(text)
  def starts(event) = event.occurrences.chronological.pluck(:starts_at)
  def local_dates(event, status: nil)
    scope = status ? event.occurrences.where(status: status) : event.occurrences
    scope.chronological.map { |row| row.starts_at.in_time_zone(zone).strftime("%a %b %-d %H:%M") }
  end

  describe "AC-7: weekly Saturday rule across the DST end (R-10, R-12)" do
    it "creates 13 scheduled rows within 90 days, identical after a second run, with local 07:30 preserved" do
      travel_to local("2026-10-20 10:00") do
        event = create(:event, :weekly, :published, venue: venue, dtstart: local("2026-10-24 07:30"), duration_minutes: 150)

        first = described_class.call(event)
        second = described_class.call(event)

        expect(first).to have_attributes(created: 13, updated: 0, cancelled: 0, skipped: false)
        expect(second).to have_attributes(created: 0, updated: 0, cancelled: 0, skipped: false)
        expect(event.occurrences.scheduled.count).to eq(13)
        expect(event.reload.occurrences_count).to eq(13)

        by_date = event.occurrences.index_by { |row| row.starts_at.in_time_zone(zone).to_date }
        expect(by_date[Date.new(2026, 10, 31)].starts_at.utc.strftime("%H:%MZ")).to eq("14:30Z")
        expect(by_date[Date.new(2026, 11, 7)].starts_at.utc.strftime("%H:%MZ")).to eq("15:30Z")
        expect(event.occurrences.all? { |row| row.ends_at == row.starts_at + 150.minutes }).to be(true)
        expect(event.occurrences.all? { |row| row.location.y.round(4) == 33.6172 }).to be(true)
        expect(starts(event).first).to eq(local("2026-10-24 07:30"))
        expect(starts(event).last).to eq(local("2027-01-16 07:30"))
      end
    end
  end

  describe "AC-8: an overridden row survives a rule change; dropped rows are cancelled, never deleted (R-11)" do
    it "keeps the Nov 14 row at 08:00, cancels the other future Saturdays, and adds Sundays" do
      travel_to local("2026-10-20 10:00") do
        event = create(:event, :weekly, :published, venue: venue, dtstart: local("2026-10-24 07:30"))
        described_class.call(event)
        nov14 = event.occurrences.find_by(starts_at: local("2026-11-14 07:30"))
        nov14.update!(starts_at: local("2026-11-14 08:00"), overridden_at: Time.current, override_note: "Later start")

        event.update!(rrule: "FREQ=WEEKLY;BYDAY=SU")
        result = described_class.call(event)

        expect(nov14.reload).to have_attributes(status: "scheduled", starts_at: local("2026-11-14 08:00"))
        expect(event.occurrences.count).to eq(13 + 13)
        expect(result.cancelled).to eq(12)
        expect(result.created).to eq(13)
        saturdays = event.occurrences.where.not(id: nov14.id).select { |row| row.starts_at.in_time_zone(zone).saturday? }
        expect(saturdays.map(&:status).uniq).to eq([ "cancelled" ])
        sundays = event.occurrences.scheduled.select { |row| row.starts_at.in_time_zone(zone).sunday? }
        expect(sundays.map { |row| row.starts_at.in_time_zone(zone).strftime("%F") }.first(2)).to eq(%w[2026-10-25 2026-11-01])
        expect(event.reload.occurrences_count).to eq(14)

        described_class.call(event)
        expect(event.occurrences.count).to eq(26)
        expect(nov14.reload.starts_at).to eq(local("2026-11-14 08:00"))
      end
    end
  end

  describe "AC-9: monthly ordinals and seasonal bounds (R-3, R-10)" do
    it "puts monthly rows on Oct 4, Nov 1, Dec 6 and stops seasonal rows at Oct 31" do
      travel_to local("2026-10-01 09:00") do
        monthly = create(:event, :monthly, :published, venue: venue, dtstart: local("2026-10-04 07:30"))
        seasonal = create(:event, :seasonal, :published, venue: venue, dtstart: local("2026-10-03 07:30"),
                                                         rrule_until: local("2026-10-31").end_of_day)

        described_class.call(monthly)
        described_class.call(seasonal)

        expect(local_dates(monthly)).to eq([ "Sun Oct 4 07:30", "Sun Nov 1 07:30", "Sun Dec 6 07:30" ])
        expect(local_dates(seasonal)).to eq([ "Sat Oct 3 07:30", "Sat Oct 10 07:30", "Sat Oct 17 07:30", "Sat Oct 24 07:30", "Sat Oct 31 07:30" ])
        expect(seasonal.occurrences.where("starts_at > ?", local("2026-11-01")).count).to eq(0)
      end
    end
  end

  describe "AC-10: announced events (R-11, R-13)" do
    it "creates nothing, and keeps a manually added overridden row across runs" do
      event = create(:event, :announced, :published, venue: venue)
      expect(described_class.call(event)).to have_attributes(skipped: true)
      expect(event.occurrences.count).to eq(0)

      create(:event_occurrence, :overridden, event: event, starts_at: GeoFixtures.next_saturday_0730)
      described_class.call(event)
      described_class.call(event)
      expect(event.occurrences.count).to eq(1)
      expect(event.occurrences.first).to be_scheduled
      expect(event.reload.occurrences_count).to eq(1)
    end
  end

  describe "once, skips, and refreshes" do
    it "creates exactly one row for once, even beyond the horizon, and moves it when dtstart changes" do
      event = create(:event, :published, venue: venue, dtstart: 120.days.from_now.change(hour: 14, min: 30))
      expect(described_class.call(event).created).to eq(1)
      expect(described_class.call(event)).to have_attributes(created: 0, cancelled: 0)

      old_start = event.dtstart
      event.update!(dtstart: old_start + 1.day)
      result = described_class.call(event)
      expect(result).to have_attributes(created: 1, cancelled: 1)
      expect(event.occurrences.find_by(starts_at: old_start)).to be_cancelled
      expect(event.occurrences.scheduled.pluck(:starts_at)).to eq([ old_start + 1.day ])
      expect(event.reload.occurrences_count).to eq(1)
    end

    it "does nothing for draft, cancelled, or dormant events, and creates no past rows" do
      draft = create(:event, :weekly, venue: venue)
      cancelled = create(:event, :weekly, :cancelled, venue: venue)
      dormant = create(:event, :weekly, :published, venue: venue, dormant_at: 1.day.ago)
      [ draft, cancelled, dormant ].each do |event|
        expect(described_class.call(event)).to have_attributes(skipped: true)
        expect(event.occurrences.count).to eq(0)
      end

      old = create(:event, :weekly, :published, venue: venue, dtstart: 2.years.ago.change(hour: 14, min: 30))
      described_class.call(old)
      expect(old.occurrences.where("starts_at < ?", Time.current).count).to eq(0)
      expect(old.occurrences.count).to be_between(12, 14)
    end

    it "cancels future rows once rrule_until has passed and re-schedules rows the rule produces again" do
      travel_to local("2026-10-20 10:00") do
        event = create(:event, :seasonal, :published, venue: venue, dtstart: local("2026-10-24 07:30"),
                                                      rrule_until: local("2026-12-31").end_of_day)
        described_class.call(event)
        expect(event.occurrences.scheduled.count).to eq(10)

        event.update!(rrule_until: local("2026-11-07").end_of_day)
        expect(described_class.call(event).cancelled).to eq(7)
        expect(event.occurrences.count).to eq(10)

        event.update!(rrule_until: local("2026-12-31").end_of_day)
        expect(described_class.call(event)).to have_attributes(created: 0, updated: 7, cancelled: 0)
        expect(event.occurrences.scheduled.count).to eq(10)
      end
    end

    it "refreshes ends_at after a duration change and location after a venue change, leaving overridden rows alone" do
      event = create(:event, :weekly, :published, venue: venue)
      described_class.call(event)
      pinned = event.occurrences.chronological.first
      pinned.update!(overridden_at: Time.current)

      inland = create(:venue, :inland)
      event.update!(duration_minutes: 90, venue: inland)
      result = described_class.call(event)

      expect(result.updated).to eq(event.occurrences.count - 1)
      moved = event.occurrences.where.not(id: pinned.id).first
      expect(moved.ends_at).to eq(moved.starts_at + 90.minutes)
      expect(moved.location.y).to be_within(0.0001).of(34.1065)
      expect(pinned.reload.location.y).to be_within(0.0001).of(33.6172)
      expect(pinned.ends_at).to eq(pinned.starts_at + 120.minutes)
    end

    it "keeps a row that is in progress right now" do
      travel_to local("2026-10-24 08:00") do
        event = create(:event, :weekly, :published, venue: venue, dtstart: local("2026-10-24 07:30"))
        described_class.call(event)
        expect(starts(event).first).to eq(local("2026-10-24 07:30"))
      end
    end
  end
end
