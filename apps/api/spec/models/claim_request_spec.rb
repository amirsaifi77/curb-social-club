require "rails_helper"

RSpec.describe ClaimRequest do
  it "validates the claim shape" do
    expect(build(:claim_request)).to be_valid
    expect(build(:claim_request, claim_as_type: "Sponsor")).not_to be_valid
    expect(build(:claim_request, relationship: nil)).not_to be_valid
    expect(build(:claim_request, relationship: "x" * 501)).not_to be_valid
    expect(build(:claim_request, evidence_url: "instagram.com/x")).not_to be_valid
    expect(build(:claim_request, evidence_url: nil)).to be_valid
    expect(build(:claim_request, status: "open")).not_to be_valid
  end

  it "requires venue permission to be confirmed" do
    request = build(:claim_request, venue_permission_confirmed: false)
    expect(request).not_to be_valid
    expect(request.errors[:venue_permission_confirmed]).to eq([ "must be confirmed" ])
  end

  it "claims as the claimant or as a club the claimant manages" do
    stranger = create(:user)
    other_user = build(:claim_request, claim_as_id: stranger.id)
    expect(other_user).not_to be_valid
    expect(other_user.errors[:claim_as]).to eq([ "must be the claimant" ])

    expect(build(:claim_request, :as_club)).to be_valid

    user = create(:user)
    club = create(:club)
    create(:club_membership, :admin, club: club, user: user)
    expect(build(:claim_request, user: user, claim_as_type: "Club", claim_as_id: club.id)).to be_valid

    plain_member = create(:user)
    create(:club_membership, club: club, user: plain_member)
    expect(build(:claim_request, user: plain_member, claim_as_type: "Club", claim_as_id: club.id)).not_to be_valid
    expect(build(:claim_request, user: stranger, claim_as_type: "Club", claim_as_id: club.id)).not_to be_valid
  end

  it "allows one pending claim per user and event, and more once reviewed" do
    first = create(:claim_request)
    duplicate = build(:claim_request, user: first.user, event: first.event, claim_as_id: first.user_id)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:event_id]).to eq([ "already has a pending claim from this user" ])

    first.update!(status: "rejected", reviewed_by: create(:user), reviewed_at: Time.current, review_note: "No evidence")
    expect(duplicate).to be_valid
  end
end
