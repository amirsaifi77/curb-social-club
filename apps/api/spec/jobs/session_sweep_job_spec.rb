require "rails_helper"

RSpec.describe SessionSweepJob do
  it "deletes expired sessions only" do
    user = create(:user)
    expired = create(:session, user: user, expires_at: 1.hour.ago)
    live = create(:session, user: user)

    described_class.perform_now

    expect(Session.where(id: expired.id)).to be_empty
    expect(Session.where(id: live.id)).to exist
  end
end
