require "rails_helper"

RSpec.describe Club do
  it "validates slug, join policy, status, and lengths (R-1)" do
    expect(build(:club, slug: "ab")).not_to be_valid
    expect(build(:club, slug: "Has Space")).not_to be_valid
    expect(build(:club, slug: "a" * 41)).not_to be_valid
    expect(build(:club, join_policy: "closed")).not_to be_valid
    expect(build(:club, status: "archived")).not_to be_valid
    expect(build(:club, description: "x" * 1001)).not_to be_valid
    expect(build(:club, name: nil)).not_to be_valid
  end

  it "treats slugs case-insensitively and generates one from the name when blank" do
    create(:club, slug: "back-bay")
    expect(build(:club, slug: "Back-Bay")).not_to be_valid
    expect(create(:club, name: "Back Bay Air-Cooled", slug: nil).slug).to eq("back-bay-air-cooled")
  end

  it "AC-6: renaming the club rewrites host_name on every hosted event (R-2)" do
    club = create(:club, name: "Back Bay Air-Cooled")
    first = create(:event, host: club)
    second = create(:event, :published, host: club)
    other = create(:event, host: create(:club, name: "Other Club"))

    club.update!(name: "Back Bay Air Cooled Society")

    expect(first.reload.host_name).to eq("Back Bay Air Cooled Society")
    expect(second.reload.host_name).to eq("Back Bay Air Cooled Society")
    expect(other.reload.host_name).to eq("Other Club")
    expect(club.events.where.not(host_name: club.name)).to be_empty
  end

  it "AC-2 (model part): a hidden club leaves the visible scope but stays the host of its events (R-5)" do
    club = create(:club, :hidden)
    event = create(:event, :published, host: club)

    expect(described_class.visible).not_to include(club)
    expect(event.reload.host).to eq(club)
    expect(event.host_type).to eq("Club")
    expect(event.host_name).to eq(club.name)
  end

  it "counts active memberships only in members_count (R-4)" do
    club = create(:club)
    expect(club.reload.members_count).to eq(1)
    create(:club_membership, club: club)
    invited = create(:club_membership, :invited, club: club)
    expect(club.reload.members_count).to eq(2)

    invited.update!(status: "active")
    expect(club.reload.members_count).to eq(3)
    invited.destroy!
    expect(club.reload.members_count).to eq(2)
  end

  it "exposes the owner and the managers" do
    owner = create(:user)
    club = create(:club, owner: owner)
    admin = create(:club_membership, :admin, club: club).user
    create(:club_membership, club: club)

    expect(club.owner).to eq(owner)
    expect(club.memberships.managers.map(&:user)).to contain_exactly(owner, admin)
    expect(club.members.count).to eq(3)
  end

  it "destroys its memberships with it and refuses to go while it hosts events" do
    club = create(:club)
    expect { club.destroy! }.to change(ClubMembership, :count).by(-1)

    hosting = create(:club)
    create(:event, host: hosting)
    expect(hosting.destroy).to be(false)
    expect(hosting.memberships.count).to eq(1)
  end

  it "trims a generated slug that truncation leaves ending in a hyphen" do
    club = create(:club, name: "#{'x' * 39} y", slug: nil)
    expect(club.slug).to eq("x" * 39)
  end
end
