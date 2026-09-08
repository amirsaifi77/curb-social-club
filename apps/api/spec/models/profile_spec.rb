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

  describe "validations (R-1 to R-3)" do
    it "AC-3: rejects a reserved handle, a bad one, and a taken one, and stores it lowercase" do
      profile = build(:profile, handle: "Admin")
      expect(profile).not_to be_valid
      expect(profile.errors[:handle]).to eq([ "is reserved" ])

      expect(build(:profile, handle: "a")).not_to be_valid
      expect(build(:profile, handle: "Bad Handle")).not_to be_valid
      expect(build(:profile, handle: "a" * 25)).not_to be_valid
      expect(build(:profile, handle: "curb")).not_to be_valid

      create(:user).profile.update!(handle: "taken_one")
      expect(build(:profile, handle: "Taken_One")).not_to be_valid

      renamed = create(:user).profile
      renamed.update!(handle: "Back_Bay_Amir")
      expect(renamed.handle).to eq("back_bay_amir")
    end

    it "AC-4: validates every link key and format, and strips a leading @" do
      profile = build(:profile, links: { "instagram" => "@back.bay", "x" => "toolonghandle_1234", "website" => "backbay.coffee" })
      expect(profile).not_to be_valid
      expect(profile.errors[:links]).to contain_exactly("x is invalid", "website is invalid")

      ok = create(:user).profile
      ok.update!(links: { "instagram" => "@back.bay", "website" => "https://backbay.coffee", "x" => "backbay",
                          "tiktok" => "back.bay", "threads" => "back.bay", "youtube" => "backbay" })
      expect(ok.links["instagram"]).to eq("back.bay")

      expect(build(:profile, links: { "facebook" => "backbay" })).not_to be_valid
      expect(build(:profile, links: { "website" => "https://#{'a' * 200}.com" })).not_to be_valid
      blank = create(:user).profile
      blank.update!(links: { "instagram" => "  " })
      expect(blank.links).to eq({})
    end

    it "bounds display_name, bio, and home_label, and rounds home_location to two decimals" do
      expect(build(:profile, display_name: "")).not_to be_valid
      expect(build(:profile, display_name: "a" * 41)).not_to be_valid
      expect(build(:profile, bio: "a" * 281)).not_to be_valid
      expect(build(:profile, home_label: "a" * 61)).not_to be_valid

      profile = create(:user).profile
      profile.update!(home_location: Geo.point(33.617234, -117.927891))
      expect(profile.home_location.y).to eq(33.62)
      expect(profile.home_location.x).to eq(-117.93)
    end
  end

  it "leaves events alone when other columns change" do
    user = create(:user)
    event = create(:event, host: user)
    expect { user.profile.update!(bio: "Air-cooled only") }.not_to(change { event.reload.updated_at })
  end
end
