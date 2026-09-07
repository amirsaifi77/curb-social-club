require "rails_helper"

RSpec.describe Auth::SessionIssuer do
  let(:user) { create(:user) }

  it "issues a 32-byte base64url token and stores only its SHA256 digest (R-2)" do
    issued = described_class.issue(user, ip: "127.0.0.1", user_agent: "curb/0.1")
    expect(Base64.urlsafe_decode64(issued.token).bytesize).to eq(32)
    expect(issued.session.token_digest).to eq(Digest::SHA256.hexdigest(issued.token))
    expect(issued.session.expires_at).to be_within(1.minute).of(90.days.from_now)
    expect(described_class.find(issued.token)).to eq(issued.session)
  end

  it "does not find expired or unknown tokens" do
    issued = described_class.issue(user)
    issued.session.update!(expires_at: 1.minute.ago)
    expect(described_class.find(issued.token)).to be_nil
    expect(described_class.find("nope")).to be_nil
    expect(described_class.find(nil)).to be_nil
  end
end
