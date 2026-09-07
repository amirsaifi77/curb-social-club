require "rails_helper"

RSpec.describe Auth::GoogleTokenVerifier do
  subject(:verifier) { described_class.new }

  it "returns the claims for a valid token from either issuer" do
    expect(verifier.verify(google_token(sub: "g1"))["sub"]).to eq("g1")
    expect(verifier.verify(google_token(sub: "g2", iss: "accounts.google.com"))["sub"]).to eq("g2")
  end

  it "rejects an unverified email, wrong audience, and expired token" do
    expect { verifier.verify(google_token(email_verified: false)) }.to raise_error(Auth::InvalidToken)
    expect { verifier.verify(google_token(aud: "other-client")) }.to raise_error(Auth::InvalidToken)
    expect { verifier.verify(google_token(exp: 1.minute.ago.to_i)) }.to raise_error(Auth::InvalidToken)
  end

  it "verifies against a different audience for admin sign-in" do
    admin = described_class.new(audience: "admin-client")
    expect(admin.verify(google_token(aud: "admin-client"))["aud"]).to eq("admin-client")
    expect { admin.verify(google_token) }.to raise_error(Auth::InvalidToken)
  end
end
