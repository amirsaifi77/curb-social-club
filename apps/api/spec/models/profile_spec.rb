require "rails_helper"

RSpec.describe Profile do
  it "AC-12 (model part): a display_name change rewrites host_name on the user's events (events R-2)" do
    user = create(:user)
    user.profile.update!(display_name: "Ada")
    first = create(:event, host: user)
    second = create(:event, :published, host: user)
    other = create(:event)

    user.profile.update!(display_name: "Ada Lovelace")

    expect(first.reload.host_name).to eq("Ada Lovelace")
    expect(second.reload.host_name).to eq("Ada Lovelace")
    expect(other.reload.host_name).to eq("Driver")
  end

  it "leaves events alone when other columns change" do
    user = create(:user)
    event = create(:event, host: user)
    expect { user.profile.update!(bio: "Air-cooled only") }.not_to(change { event.reload.updated_at })
  end
end
