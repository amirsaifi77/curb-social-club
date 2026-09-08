require "rails_helper"

RSpec.describe SponsorPolicy do
  subject(:policy) { described_class }

  let(:sponsor) { create(:sponsor) }
  let(:admin) { create(:user, role: "admin") }

  it "AC-3: a hidden sponsor is visible only to a platform admin, and only an admin manages (R-5, R-11)" do
    hidden = create(:sponsor, :hidden)
    member = create(:user)

    expect(policy.new(nil, sponsor).show?).to be(true)
    expect(policy.new(nil, hidden).show?).to be(false)
    expect(policy.new(member, hidden).show?).to be(false)
    expect(policy.new(admin, hidden).show?).to be(true)

    expect(policy.new(admin, sponsor).manage?).to be(true)
    expect(policy.new(member, sponsor).manage?).to be(false)
    expect(policy.new(nil, sponsor).manage?).to be(false)
  end
end
