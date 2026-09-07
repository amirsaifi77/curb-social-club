require "rails_helper"

RSpec.describe Event do
  describe "host (R-1)" do
    it "accepts a user, a club, and a sponsor and writes host_name from each (R-2)" do
      user = create(:user)
      user.profile.update!(display_name: "Ada")
      club = create(:club, name: "Back Bay Air-Cooled")
      sponsor = create(:sponsor, name: "Harbor Coffee")

      expect(create(:event, host: user).host_name).to eq("Ada")
      expect(create(:event, host: club).host_name).to eq("Back Bay Air-Cooled")
      expect(create(:event, host: sponsor).host_name).to eq("Harbor Coffee")
    end

    it "rejects a host type outside User, Club, Sponsor" do
      event = build(:event)
      event.host_type = "Venue"
      event.host_id = create(:venue).id
      expect(event).not_to be_valid
      expect(event.errors[:host_type]).to include("is not included in the list")
    end

    it "rejects a host id that does not exist in the host's table" do
      event = build(:event, host: create(:club))
      event.host_id = SecureRandom.uuid
      expect(event).not_to be_valid
      expect(event.errors[:host]).to eq([ "must exist" ])

      user_event = build(:event)
      user_event.host_type = "User"
      user_event.host_id = SecureRandom.uuid
      expect(user_event).not_to be_valid
      expect(user_event.errors[:host]).to eq([ "must exist" ])
    end

    it "requires created_by to be a user" do
      event = build(:event, created_by: nil)
      expect(event).not_to be_valid
      expect(event.errors[:created_by]).to include("must exist")
    end

    it "rewrites host_name on every save" do
      club = create(:club, name: "Before")
      event = create(:event, host: club)
      club.update_columns(name: "After")
      event.reload.update!(title: "Same meet")
      expect(event.host_name).to eq("After")
    end
  end

  describe "slug (R-5)" do
    it "generates <kebab-title>-<6 lowercase alphanumerics>" do
      event = create(:event, title: "South OC Cars & Coffee!")
      expect(event.slug).to match(/\Asouth-oc-cars-coffee-[a-z0-9]{6}\z/)
    end

    it "keeps an explicit slug for seeds and caps generated ones at 60 chars" do
      expect(create(:event, slug: "south-oc-cars-and-coffee").slug).to eq("south-oc-cars-and-coffee")
      long = create(:event, title: "A" * 100)
      expect(long.slug.length).to be <= 60
      expect(long.slug).to match(described_class::SLUG_FORMAT)
    end

    it "is unique and well formed" do
      create(:event, slug: "taken-slug")
      expect(build(:event, slug: "taken-slug")).not_to be_valid
      expect(build(:event, slug: "Bad Slug")).not_to be_valid
      expect(build(:event, slug: "ab")).not_to be_valid
    end

    it "never changes after publish" do
      draft = create(:event, slug: "draft-slug")
      expect(draft.update(slug: "renamed-draft")).to be(true)

      published = create(:event, :published, slug: "published-slug")
      expect(published.update(slug: "renamed")).to be(false)
      expect(published.errors[:slug]).to eq([ "cannot change after publish" ])
    end
  end

  describe "cadence and rrule (R-3, R-4)" do
    it "AC-11: rejects each bad rule and a weekly cadence without a rule with the bad-rrule message" do
      message = "Rrule #{Recurrence::RruleValidator::MESSAGE}"
      [
        [ "weekly", "FREQ=DAILY" ],
        [ "weekly", "FREQ=WEEKLY" ],
        [ "weekly", "FREQ=WEEKLY;BYDAY=SA;UNTIL=20261231T000000Z" ],
        [ "monthly", "FREQ=MONTHLY;BYDAY=SA,SU" ],
        [ "weekly", nil ]
      ].each do |cadence, rrule|
        event = build(:event, cadence: cadence, rrule: rrule)
        expect(event.save).to be(false), "expected #{cadence} with #{rrule.inspect} to fail"
        expect(event.errors.full_messages).to eq([ message ])
      end
    end

    it "requires the frequency to match the cadence" do
      expect(build(:event, cadence: "weekly", rrule: "FREQ=MONTHLY;BYDAY=1SU")).not_to be_valid
      expect(build(:event, cadence: "monthly", rrule: "FREQ=WEEKLY;BYDAY=SA")).not_to be_valid
      expect(build(:event, :weekly)).to be_valid
      expect(build(:event, :monthly)).to be_valid
    end

    it "requires rrule to be blank for once and announced" do
      once = build(:event, cadence: "once", rrule: "FREQ=WEEKLY;BYDAY=SA")
      expect(once).not_to be_valid
      expect(once.errors[:rrule]).to eq([ "must be blank for once and announced" ])
      expect(build(:event, :announced, rrule: "FREQ=WEEKLY;BYDAY=SA")).not_to be_valid
    end

    it "requires a rule and rrule_until for seasonal" do
      expect(build(:event, :seasonal)).to be_valid
      expect(build(:event, :seasonal, rrule_until: nil)).not_to be_valid
      expect(build(:event, :seasonal, rrule: nil)).not_to be_valid
      expect(build(:event, cadence: "seasonal", rrule: "FREQ=MONTHLY;BYDAY=-1SA", rrule_until: 1.year.from_now)).to be_valid
    end

    it "allows a null dtstart only for announced" do
      expect(build(:event, :announced)).to be_valid
      once = build(:event, dtstart: nil)
      expect(once).not_to be_valid
      expect(once.errors[:dtstart]).to eq([ "is required unless cadence is announced" ])
    end

    it "rejects an unknown cadence" do
      expect(build(:event, cadence: "daily")).not_to be_valid
    end
  end

  describe "other columns" do
    it "checks tags, duration, timezone, status, visibility, rsvp_mode, and parking_note" do
      expect(build(:event, tags: %w[jdm euro])).to be_valid
      expect(build(:event, tags: %w[jdm drift])).not_to be_valid
      expect(build(:event, tags: %w[jdm jdm])).not_to be_valid
      expect(build(:event, duration_minutes: 10)).not_to be_valid
      expect(build(:event, duration_minutes: 721)).not_to be_valid
      expect(build(:event, timezone: "Mars/Olympus")).not_to be_valid
      expect(build(:event, timezone: "Eastern Time (US & Canada)")).not_to be_valid
      expect(build(:event, status: "live")).not_to be_valid
      expect(build(:event, visibility: "private")).not_to be_valid
      expect(build(:event, rsvp_mode: "closed")).not_to be_valid
      expect(build(:event, parking_note: "x" * 201)).not_to be_valid
    end

    it "copies the venue timezone at create unless one is given" do
      venue = create(:venue, timezone: "America/New_York")
      expect(create(:event, venue: venue, timezone: nil).timezone).to eq("America/New_York")
      expect(create(:event, venue: venue, timezone: "America/Denver").timezone).to eq("America/Denver")
    end

    it "keeps source_url unique, stores a blank one as null, and stamps published_at on publish" do
      create(:event, source_url: "https://www.evite.com/event/abc")
      expect(build(:event, source_url: "https://www.evite.com/event/abc")).not_to be_valid
      create(:event, source_url: "")
      expect(create(:event, source_url: "").source_url).to be_nil

      event = create(:event)
      expect(event.published_at).to be_nil
      event.update!(status: "published")
      expect(event.published_at).to be_within(2.seconds).of(Time.current)
    end
  end

  describe "occurrences_count (R-9)" do
    it "counts scheduled occurrences only" do
      event = create(:event, :weekly)
      first = create(:event_occurrence, event: event)
      create(:event_occurrence, event: event, starts_at: first.starts_at + 7.days)
      cancelled = create(:event_occurrence, :cancelled, event: event, starts_at: first.starts_at + 14.days)
      expect(event.reload.occurrences_count).to eq(2)

      cancelled.update!(status: "scheduled")
      expect(event.reload.occurrences_count).to eq(3)

      first.destroy!
      expect(event.reload.occurrences_count).to eq(2)
    end
  end

  describe "decay clocks (R-25, R-26)" do
    it "scopes stale and decayable off one confirmation clock, falling back to published_at then created_at" do
      fresh = create(:event, :published, last_confirmed_at: 1.day.ago)
      stale = create(:event, :published, last_confirmed_at: 31.days.ago)
      old = create(:event, :published, last_confirmed_at: 91.days.ago)
      claimed = create(:event, :published, claimed_at: 1.day.ago, last_confirmed_at: 200.days.ago)
      draft = create(:event, last_confirmed_at: 200.days.ago)
      never = create(:event, :published)
      never.update_columns(published_at: nil, created_at: 200.days.ago, last_confirmed_at: nil)

      # stale mirrors stale_sql exactly (unclaimed plus the clock), so the
      # scope and the flag on a payload can never disagree; callers that
      # only want live rows compose it, as the dashboard does in 1.9.
      expect(described_class.stale).to contain_exactly(stale, old, never, draft)
      expect(described_class.published.stale).to contain_exactly(stale, old, never)
      expect(described_class.decayable).to contain_exactly(old, never)
      expect(described_class.decayable).not_to include(fresh, claimed, draft)
      expect(described_class.decayable.where(id: old.id).count).to eq(1)
      old.update!(dormant_at: Time.current)
      expect(described_class.decayable).not_to include(old)
      expect(described_class.not_dormant).not_to include(old)
    end
  end

  describe "host counter caches" do
    it "keeps clubs.events_count on publish, cancel, host change, and destroy" do
      club = create(:club)
      other = create(:club)
      event = create(:event, host: club)
      expect(club.reload.events_count).to eq(0)

      event.update!(status: "published")
      expect(club.reload.events_count).to eq(1)

      event.update!(host: other)
      expect(club.reload.events_count).to eq(0)
      expect(other.reload.events_count).to eq(1)

      event.update!(status: "cancelled")
      expect(other.reload.events_count).to eq(0)

      event.update!(status: "published")
      event.destroy!
      expect(other.reload.events_count).to eq(0)
    end
  end
end
