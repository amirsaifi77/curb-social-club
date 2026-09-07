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
end
