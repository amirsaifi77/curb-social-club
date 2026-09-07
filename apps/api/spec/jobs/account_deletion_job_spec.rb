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
end
