require "rails_helper"

RSpec.describe Auth::HandleGenerator do
  it "normalizes a provider name or an email local part into a handle (R-4)" do
    expect(described_class.call("Amir Saifi", "amir")).to eq("amir_saifi")
    expect(described_class.call(nil, "back.bay.amir")).to eq("back_bay_amir")
    expect(described_class.call("A", "ab")).to eq("member")
    expect(described_class.call("A" * 40, nil).length).to be <= 24
  end

  it "treats a reserved handle as a collision, so a person named Support can still sign up (R-1)" do
    Profile.reserved_handles.each do |reserved|
      handle = described_class.call(reserved.capitalize, reserved)
      expect(handle).not_to eq(reserved)
      expect(handle).to start_with(reserved)
      expect(handle).to match(Profile::HANDLE_FORMAT)
    end
  end

  it "appends digits when the handle is taken" do
    create(:user).profile.update!(handle: "amir_saifi")
    handle = described_class.call("Amir Saifi", "amir")
    expect(handle).to start_with("amir_saifi")
    expect(handle).not_to eq("amir_saifi")
  end
end
