require "rails_helper"

# Attachment URLs in payloads: absolute on the request host inside a request,
# a path outside one. The clients live on other origins, so a bare path would
# resolve against the simulator or the web app rather than the API.
RSpec.describe MediaUrls do
  let(:club) { create(:club) }

  def attach_avatar
    club.avatar.attach(io: StringIO.new("jpeg bytes"), filename: "avatar.jpg", content_type: "image/jpeg", identify: false)
  end

  it "is nil when nothing is attached" do
    expect(described_class.attachment(club.avatar)).to be_nil
    expect(described_class.attachment(nil)).to be_nil
  end

  it "is a path when no request host is known" do
    attach_avatar

    url = described_class.attachment(club.avatar)

    expect(url).to start_with("/rails/active_storage/blobs/redirect/")
    expect(url).to end_with("/avatar.jpg")
  end

  it "is absolute on the request host inside a request" do
    attach_avatar
    options = { protocol: "https://", host: "api.curbsocial.club", port: 443 }

    url = ActiveStorage::Current.set(url_options: options) { described_class.attachment(club.avatar) }

    expect(url).to start_with("https://api.curbsocial.club/rails/active_storage/blobs/redirect/")
    expect(url).to end_with("/avatar.jpg")
  end
end
