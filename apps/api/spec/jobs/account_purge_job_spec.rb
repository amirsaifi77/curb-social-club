require "rails_helper"

RSpec.describe AccountPurgeJob do
  it "hard-deletes users deleted more than 30 days ago with their identities, sessions, and profile (AC-9, Phase 0 tables)" do
    old = create(:user, :purgeable)
    create(:identity, user: old)
    create(:session, user: old)
    device = create(:device, user: old)
    recent = create(:user, :deleted)
    active = create(:user)

    described_class.perform_now

    expect(User.find_by(id: old.id)).to be_nil
    expect(Identity.where(user_id: old.id)).to be_empty
    expect(Session.where(user_id: old.id)).to be_empty
    expect(Profile.where(user_id: old.id)).to be_empty
    expect(device.reload.user_id).to be_nil
    expect(User.where(id: [ recent.id, active.id ]).count).to eq(2)
  end

  it "reassigns created_by on events, venues, and clubs and releases memberships before the row goes (R-16, AC-9 venue part)" do
    app_account = create(:app_account)
    old = create(:user, :purgeable)
    venue = create(:venue, created_by: old)
    event = create(:event, created_by: old, venue: venue, host: create(:club))
    created_club = create(:club, created_by: old)
    owned_club = create(:club, owner: old)
    joined_club = create(:club)
    create(:club_membership, club: joined_club, user: old)

    described_class.perform_now

    expect(User.find_by(id: old.id)).to be_nil
    expect(venue.reload.created_by).to eq(app_account)
    expect(event.reload.created_by).to eq(app_account)
    expect(created_club.reload.created_by).to eq(app_account)
    expect(owned_club.reload.owner).to eq(app_account)
    expect(owned_club.members_count).to eq(1)
    expect(joined_club.reload.members_count).to eq(1)
    expect(ClubMembership.where(user_id: old.id)).to be_empty
  end
end
