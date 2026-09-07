require "rails_helper"

RSpec.describe Auth::HandleGenerator do
  it "normalizes the first usable candidate" do
    expect(described_class.call("Ada Lovelace", "ada")).to eq("ada_lovelace")
    expect(described_class.call(nil, "Grace.Hopper+curb")).to eq("grace_hopper_curb")
  end

  it "skips candidates under three characters and falls back to member" do
    expect(described_class.call("A", "bo", "")).to eq("member")
  end

  it "appends random digits on collision and keeps within 24 characters" do
    create(:user).profile.update!(handle: "ada_lovelace")
    handle = described_class.call("Ada Lovelace")
    expect(handle).to match(/\Aada_lovelace\d{2,4}\z/)
    long = described_class.call("a" * 30)
    expect(long.length).to be <= 24
  end
end
