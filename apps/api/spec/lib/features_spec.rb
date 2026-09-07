require "rails_helper"

RSpec.describe Features do
  it "reads config/features.yml at boot with self-service off" do
    expect(described_class.enabled?(:clubs_self_service)).to be(false)
    expect(described_class.enabled?("sponsors_self_service")).to be(false)
    expect(Rails.configuration.x.features.keys).to contain_exactly(:clubs_self_service, :sponsors_self_service)
  end

  it "raises for an unknown flag" do
    expect { described_class.enabled?(:teleport) }.to raise_error(ArgumentError, /unknown feature flag teleport/)
  end
end
