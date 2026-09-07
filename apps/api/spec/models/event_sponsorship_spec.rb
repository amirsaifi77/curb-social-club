require "rails_helper"

RSpec.describe EventSponsorship do
  it "AC-6: rejects a seventh sponsorship and a duplicate sponsor (R-3)" do
    event = create(:event)
    sponsors = create_list(:sponsor, 6)
    sponsors.each_with_index { |sponsor, index| create(:event_sponsorship, event: event, sponsor: sponsor, position: index) }

    seventh = build(:event_sponsorship, event: event, sponsor: create(:sponsor))
    expect(seventh.save).to be(false)
    expect(seventh.errors[:base]).to eq([ "An event can have at most 6 sponsorships" ])

    duplicate = build(:event_sponsorship, event: create(:event), sponsor: sponsors.first)
    duplicate.event = event
    expect(duplicate.save).to be(false)
    expect(duplicate.errors[:sponsor_id]).to eq([ "is already attached to this event" ])
    expect(duplicate.errors[:base]).to be_present
  end

  it "is backed by a unique index on (event_id, sponsor_id)" do
    sponsorship = create(:event_sponsorship)
    expect do
      described_class.insert!({ event_id: sponsorship.event_id, sponsor_id: sponsorship.sponsor_id, role: "vendor",
                                position: 1, created_at: Time.current, updated_at: Time.current })
    end.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "recounts both sponsors when a row moves to another sponsor" do
    sponsorship = create(:event_sponsorship, event: create(:event, :published))
    old_sponsor = sponsorship.sponsor
    new_sponsor = create(:sponsor)
    expect(old_sponsor.reload.events_count).to eq(1)

    sponsorship.update!(sponsor: new_sponsor)
    expect(old_sponsor.reload.events_count).to eq(0)
    expect(new_sponsor.reload.events_count).to eq(1)
  end

  it "validates role, note, and position, and orders by position" do
    expect(build(:event_sponsorship, role: "title")).not_to be_valid
    expect(build(:event_sponsorship, note: "x" * 201)).not_to be_valid
    expect(build(:event_sponsorship, position: -1)).not_to be_valid

    event = create(:event)
    later = create(:event_sponsorship, event: event, position: 2)
    earlier = create(:event_sponsorship, event: event, position: 1)
    expect(event.sponsorships.reload).to eq([ earlier, later ])
    expect(event.sponsors).to contain_exactly(earlier.sponsor, later.sponsor)
  end
end
