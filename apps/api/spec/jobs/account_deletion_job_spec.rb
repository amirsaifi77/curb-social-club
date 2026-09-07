require "rails_helper"

RSpec.describe AccountDeletionJob do
  it "revokes the Apple refresh token once, clears sessions, and unlinks devices" do
    user = create(:user, :deleted)
    create(:identity, :apple, user: user)
    create(:session, user: user)
    device = create(:device, user: user)

    described_class.perform_now(user.id)

    expect(a_request(:post, Auth::AppleClient::REVOKE_URL.to_s)).to have_been_made.once
    expect(user.sessions.count).to eq(0)
    expect(device.reload.user_id).to be_nil
    expect(user.identities.first.provider_refresh_token).to be_nil
  end

  it "does nothing for an active user" do
    user = create(:user)
    create(:identity, :apple, user: user)
    described_class.perform_now(user.id)
    expect(a_request(:post, Auth::AppleClient::REVOKE_URL.to_s)).not_to have_been_made
  end

  it "moves hosted events to the app account, deletes drafts, rejects claims, and hands sole ownership over (R-15, AC-8 host part)" do
    app_account = create(:app_account)
    user = create(:user, :deleted)
    published = create(:event, :published, host: user, claimed_at: 1.day.ago)
    draft = create(:event, host: user)
    club = create(:club, owner: user)
    shared_club = create(:club)
    create(:club_membership, :admin, club: shared_club, user: user)
    claim = create(:claim_request, user: user, status: "pending")
    reviewed = create(:claim_request, user: user, status: "approved")

    described_class.perform_now(user.id)

    expect(published.reload).to have_attributes(host_type: "User", host_id: app_account.id, host_name: "Curb Social Club", claimed_at: nil)
    expect(Event.find_by(id: draft.id)).to be_nil
    expect(club.reload.owner).to eq(app_account)
    expect(club.members_count).to eq(1)
    expect(shared_club.reload.memberships.where(user_id: user.id)).to be_empty
    expect(shared_club.owner).not_to eq(app_account)
    expect(claim.reload).to have_attributes(status: "rejected", review_note: "Account deleted")
    expect(reviewed.reload.status).to eq("approved")
  end
end
