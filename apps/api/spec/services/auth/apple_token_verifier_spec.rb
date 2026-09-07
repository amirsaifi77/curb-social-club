require "rails_helper"

RSpec.describe Auth::AppleTokenVerifier do
  subject(:verifier) { described_class.new }

  let(:nonce) { apple_nonce }

  it "returns the claims for a valid token" do
    claims = verifier.verify(apple_token(sub: "apple-1", nonce: nonce), nonce: nonce)
    expect(claims["sub"]).to eq("apple-1")
  end

  it "rejects a bad signature, wrong audience, expired token, and mismatched nonce with one message (AC-3)" do
    bad = [
      apple_token(nonce: nonce, key: ProviderTokens::ROGUE_KEY),
      apple_token(nonce: nonce, aud: "wrong"),
      apple_token(nonce: nonce, exp: 1.minute.ago.to_i),
      apple_token(nonce: "other")
    ]
    messages = bad.map do |token|
      verifier.verify(token, nonce: nonce)
      "no error"
    rescue Auth::InvalidToken => e
      e.message
    end
    expect(messages.uniq).to eq([ Auth::TokenVerifier::MESSAGE ])
  end

  it "rejects a wrong issuer and a missing nonce" do
    expect { verifier.verify(apple_token(nonce: nonce, iss: "https://evil.example"), nonce: nonce) }.to raise_error(Auth::InvalidToken)
    expect { verifier.verify(apple_token(nonce: nonce), nonce: nil) }.to raise_error(Auth::InvalidToken)
  end

  it "caches the JWKS and refetches once on an unknown kid (R-6)" do
    allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
    verifier.verify(apple_token(nonce: nonce), nonce: nonce)
    verifier.verify(apple_token(nonce: nonce), nonce: nonce)
    expect(a_request(:get, described_class::JWKS_URL)).to have_been_made.once

    rotated = OpenSSL::PKey::RSA.new(2048)
    stub_request(:get, described_class::JWKS_URL)
      .to_return(status: 200, body: jwks_for(rotated, "apple-rotated").to_json, headers: { "Content-Type" => "application/json" })
    verifier.verify(apple_token(nonce: nonce, key: rotated, kid: "apple-rotated"), nonce: nonce)
    expect(a_request(:get, described_class::JWKS_URL)).to have_been_made.twice
  end
end
