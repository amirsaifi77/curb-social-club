require "rails_helper"

RSpec.describe Auth::SignIn do
  def sign_in(provider:, claims:, **opts)
    described_class.new(provider: provider, claims: claims, **opts).call
  end

  it "creates user, identity, and profile in one transaction with a generated handle (R-4)" do
    result = sign_in(provider: "google", claims: { "sub" => "g1", "email" => "ada@example.com", "email_verified" => true }, display_name: "Ada Lovelace")
    expect(result.is_new).to be(true)
    expect(result.user.profile).to have_attributes(handle: "ada_lovelace", display_name: "Ada Lovelace")
    expect(result.user.email).to eq("ada@example.com")
  end

  it "links only on a verified non-relay email match (AC-4, service level)" do
    existing = create(:user, email: "shared@example.com")
    linked = sign_in(provider: "apple", claims: { "sub" => "a1", "email" => "shared@example.com", "email_verified" => "true" })
    expect(linked.user).to eq(existing)
    expect(linked.is_new).to be(false)

    relay = sign_in(provider: "apple", claims: { "sub" => "a2", "email" => "x@privaterelay.appleid.com", "email_verified" => "true" })
    expect(relay.user).not_to eq(existing)
    expect(relay.user.email).to be_nil

    unverified = sign_in(provider: "google", claims: { "sub" => "g9", "email" => "shared@example.com", "email_verified" => false })
    expect(unverified.user).not_to eq(existing)
  end

  it "stores the Apple refresh token encrypted and never in raw_claims" do
    result = sign_in(provider: "apple", claims: { "sub" => "a3", "nonce" => "hashed" }, refresh_token: "rt-secret")
    identity = result.user.identities.first
    expect(identity.provider_refresh_token).to eq("rt-secret")
    expect(identity.raw_claims).not_to have_key("nonce")
    expect(Identity.connection.select_value("SELECT provider_refresh_token FROM identities WHERE id = '#{identity.id}'")).not_to include("rt-secret")
  end

  it "raises for a suspended user and links the device otherwise" do
    device = create(:device)
    result = sign_in(provider: "google", claims: { "sub" => "g5", "email" => "d@example.com", "email_verified" => true }, device: device)
    expect(device.reload.user).to eq(result.user)

    result.user.update!(status: "suspended")
    expect { sign_in(provider: "google", claims: { "sub" => "g5" }) }.to raise_error(Auth::Suspended)
  end
end
