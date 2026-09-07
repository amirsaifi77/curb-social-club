require "rails_helper"

RSpec.describe EventPolicy do
  subject(:policy) { described_class }

  let(:host) { create(:user) }
  let(:stranger) { create(:user) }
  let(:admin) { create(:user, role: "admin") }
  let(:event) { create(:event, :published, host: host) }

  describe "#edit? and #confirm? (R-24, clubs R-13)" do
    it "allows the user host, a club owner or admin, and a platform admin only" do
      expect(policy.new(host, event)).to be_edit
      expect(policy.new(admin, event)).to be_edit
      expect(policy.new(stranger, event)).not_to be_edit
      expect(policy.new(nil, event)).not_to be_edit

      owner = create(:user)
      club = create(:club, owner: owner)
      club_event = create(:event, :published, host: club)
      club_admin = create(:club_membership, :admin, club: club).user
      plain = create(:club_membership, club: club).user
      invited = create(:club_membership, :invited, club: club, role: "admin").user

      expect(policy.new(owner, club_event)).to be_edit
      expect(policy.new(club_admin, club_event)).to be_edit
      expect(policy.new(plain, club_event)).not_to be_edit
      expect(policy.new(invited, club_event)).not_to be_edit

      sponsor_event = create(:event, :published, host: create(:sponsor))
      expect(policy.new(host, sponsor_event)).not_to be_edit
      expect(policy.new(admin, sponsor_event)).to be_edit
    end

    it "matches confirm? and refuses a suspended or deleted account" do
      expect(policy.new(host, event).confirm?).to be(true)
      expect(policy.new(stranger, event).confirm?).to be(false)

      host.update!(status: "suspended")
      expect(policy.new(host, event)).not_to be_edit
      expect(policy.new(create(:user, :deleted), event)).not_to be_edit
    end
  end

  describe "#show? (R-22, R-27)" do
    it "is public for a published event, including dormant and unlisted, and private for drafts, cancelled, and hidden" do
      expect(policy.new(nil, event)).to be_show
      expect(policy.new(nil, create(:event, :published, dormant_at: Time.current))).to be_show
      expect(policy.new(nil, create(:event, :published, :unlisted))).to be_show

      draft = create(:event, host: host)
      cancelled = create(:event, :cancelled, host: host)
      hidden = create(:event, :published, host: host, hidden_at: Time.current)

      [ draft, cancelled, hidden ].each do |record|
        expect(policy.new(nil, record)).not_to be_show
        expect(policy.new(stranger, record)).not_to be_show
        expect(policy.new(host, record)).to be_show
        expect(policy.new(admin, record)).to be_show
      end
    end
  end

  describe "#host_allowed? and #sponsorships_allowed? (clubs AC-8, sponsors AC-9)" do
    it "clubs AC-8: a user with no membership in a club may not host as that club (clubs R-13)" do
      owner = create(:user)
      club = create(:club, owner: owner)
      club_admin = create(:club_membership, :admin, club: club).user
      plain = create(:club_membership, club: club).user

      expect(policy.new(owner, event).host_allowed?(club)).to be(true)
      expect(policy.new(club_admin, event).host_allowed?(club)).to be(true)
      expect(policy.new(plain, event).host_allowed?(club)).to be(false)
      expect(policy.new(stranger, event).host_allowed?(club)).to be(false)
      expect(policy.new(admin, event).host_allowed?(club)).to be(true)
      expect(policy.new(nil, event).host_allowed?(club)).to be(false)
    end

    it "lets a user host as themself, and nobody host as a sponsor until Phase 7 (sponsors R-10)" do
      expect(policy.new(host, event).host_allowed?(host)).to be(true)
      expect(policy.new(stranger, event).host_allowed?(host)).to be(false)
      expect(policy.new(admin, event).host_allowed?(host)).to be(true)

      sponsor = create(:sponsor)
      expect(policy.new(admin, event).host_allowed?(sponsor)).to be(false)
      expect(policy.new(host, event).host_allowed?(sponsor)).to be(false)
      expect(policy.new(admin, event).sponsor_host_enabled?).to be(false)
    end

    it "sponsors AC-9: only an admin may attach sponsorships at launch (sponsors R-10)" do
      expect(policy.new(admin, event).sponsorships_allowed?).to be(true)
      expect(policy.new(host, event).sponsorships_allowed?).to be(false)
      expect(policy.new(nil, event).sponsorships_allowed?).to be(false)
    end
  end

  describe "#claim? and #claim_status" do
    it "offers the claim to a signed-in non-host of an unclaimed event, once" do
      expect(policy.new(nil, event).claim?).to be(false)
      expect(policy.new(nil, event).claim_status).to be_nil
      expect(policy.new(stranger, event).claim?).to be(true)
      expect(policy.new(host, event).claim?).to be(false)
      expect(policy.new(stranger, create(:event, :published, claimed_at: 1.day.ago)).claim?).to be(false)

      expect(policy.new(stranger, event).claim_status).to be_nil
      create(:claim_request, user: stranger, event: event, claim_as_id: stranger.id)
      expect(policy.new(stranger, event).claim_status).to eq("pending")
      expect(policy.new(create(:user), event).claim_status).to be_nil
    end
  end
end
