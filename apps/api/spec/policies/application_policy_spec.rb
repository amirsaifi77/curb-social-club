require "rails_helper"

RSpec.describe ApplicationPolicy do
  it "denies everything by default, including for a nil user" do
    policy = described_class.new(nil, Object.new)
    expect([ policy.index?, policy.show?, policy.create?, policy.update?, policy.destroy? ]).to all(be(false))
    expect(policy.admin?).to be(false)
    expect(policy.moderator?).to be(false)
  end

  it "exposes admin? and moderator? from the role" do
    expect(described_class.new(build(:user, role: "admin"), nil)).to have_attributes(admin?: true, moderator?: true)
    expect(described_class.new(build(:user, role: "moderator"), nil)).to have_attributes(admin?: false, moderator?: true)
    expect(described_class.new(build(:user), nil)).to have_attributes(admin?: false, moderator?: false, member?: true)
  end

  it "maps NotAuthorizedError to 403 forbidden" do
    controller = Api::V1::MeController.new
    expect(Api::V1::ApplicationController.rescue_handlers.map(&:first)).to include("Pundit::NotAuthorizedError")
    expect(controller).to be_a(Pundit::Authorization)
  end
end
