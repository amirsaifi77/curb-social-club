require "rails_helper"

RSpec.describe ClubPolicy do
  subject(:policy) { described_class }

  let(:owner) { create(:user) }
  let(:club) { create(:club, owner: owner) }
  let(:stranger) { create(:user) }
  let(:admin) { create(:user, role: "admin") }

  it "lets an owner, a club admin, and a platform admin manage; nobody else (R-12)" do
    club_admin = create(:club_membership, :admin, club: club).user
    plain = create(:club_membership, club: club).user
    invited = create(:club_membership, :invited, club: club, role: "admin").user

    expect(policy.new(owner, club).manage?).to be(true)
    expect(policy.new(club_admin, club).manage?).to be(true)
    expect(policy.new(admin, club).manage?).to be(true)
    expect(policy.new(plain, club).manage?).to be(false)
    expect(policy.new(invited, club).manage?).to be(false)
    expect(policy.new(stranger, club).manage?).to be(false)
    expect(policy.new(nil, club).manage?).to be(false)

    expect(policy.new(owner, club).owner?).to be(true)
    expect(policy.new(club_admin, club).owner?).to be(false)
  end

  it "AC-2: a hidden club is visible only to its managers and platform admins (R-5)" do
    hidden = create(:club, :hidden, owner: owner)

    expect(policy.new(nil, hidden).show?).to be(false)
    expect(policy.new(stranger, hidden).show?).to be(false)
    expect(policy.new(owner, hidden).show?).to be(true)
    expect(policy.new(admin, hidden).show?).to be(true)
    expect(policy.new(nil, club).show?).to be(true)
  end

  it "refuses a suspended or deleted account" do
    club.memberships.find_by(user_id: owner.id)
    owner.update!(status: "suspended")
    expect(policy.new(owner, club).manage?).to be(false)
    expect(policy.new(create(:user, :deleted), club).manage?).to be(false)
  end
end
