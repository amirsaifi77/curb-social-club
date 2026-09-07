require "rails_helper"

RSpec.describe ClubMembership do
  it "AC-5: rejects a second owner and refuses to destroy the owner (R-3)" do
    club = create(:club)
    second = build(:club_membership, :owner, club: club)
    expect(second.save).to be(false)
    expect(second.errors[:role]).to eq([ "is taken: a club has exactly one owner" ])

    owner = club.owner_membership
    expect(owner.destroy).to be(false)
    expect(owner.errors[:base]).to eq([ "A club must keep its owner" ])
    expect { owner.destroy! }.to raise_error(ActiveRecord::RecordNotDestroyed)
    expect(club.reload.owner_membership).to eq(owner)
  end

  it "rejects demoting the owner and promoting a member to a second owner" do
    club = create(:club)
    member = create(:club_membership, club: club)

    owner = club.owner_membership
    expect(owner.update(role: "admin")).to be(false)
    expect(owner.errors[:role]).to eq([ "cannot change: a club must keep its owner" ])

    expect(member.update(role: "owner")).to be(false)
    expect(member.errors[:role]).to eq([ "is taken: a club has exactly one owner" ])
  end

  it "is backed by a partial unique index on the owner row" do
    club = create(:club)
    expect do
      described_class.insert!({ club_id: club.id, user_id: create(:user).id, role: "owner", status: "active",
                                created_at: Time.current, updated_at: Time.current })
    end.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "requires the owner to be active and one row per user and club" do
    club = create(:club, owner: nil)
    expect(build(:club_membership, :owner, club: club, status: "invited")).not_to be_valid
    expect(create(:club_membership, :owner, club: club)).to be_persisted

    member = create(:club_membership, club: club)
    duplicate = build(:club_membership, club: club, user: member.user)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:user_id]).to eq([ "is already a member" ])
    expect(build(:club_membership, role: "founder")).not_to be_valid
    expect(build(:club_membership, status: "banned")).not_to be_valid
  end

  it "keeps the owner and the counter when a user is destroyed, and pins club_id" do
    club = create(:club)
    member = create(:club_membership, club: club)
    expect(club.reload.members_count).to eq(2)

    member.user.destroy!
    expect(club.reload.members_count).to eq(1)

    expect { club.owner.destroy! }.to raise_error(ActiveRecord::RecordNotDestroyed)
    expect(club.reload.owner_membership).to be_present

    moved = create(:club_membership, club: club)
    expect(moved.update(club: create(:club))).to be(false)
    expect(moved.errors[:club_id]).to eq([ "cannot change" ])
  end

  it "stamps joined_at when a membership becomes active" do
    invited = create(:club_membership, :invited)
    expect(invited.joined_at).to be_nil
    invited.update!(status: "active")
    expect(invited.joined_at).to be_within(2.seconds).of(Time.current)
  end
end
