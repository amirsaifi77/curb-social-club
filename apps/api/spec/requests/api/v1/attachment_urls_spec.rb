require "rails_helper"

# MediaUrls through a real request: Api::V1::ApplicationController sets the
# request host, so every attachment URL in a payload is one a client on
# another origin can load.
RSpec.describe "attachment URLs in v1 payloads", type: :request do
  it "renders an event cover as an absolute URL on the request host" do
    event = create_meet(:corona_del_mar, title: "Back Bay Coffee")
    event.cover.attach(io: StringIO.new("jpeg bytes"), filename: "cover.jpg", content_type: "image/jpeg", identify: false)

    get "/v1/events/#{event.slug}"

    expect(response).to have_http_status(:ok)
    cover_url = response.parsed_body.dig("data", "cover_url")
    expect(cover_url).to start_with("http://www.example.com/rails/active_storage/blobs/redirect/")
    expect(cover_url).to end_with("/cover.jpg")
  end

  # The redirect route hands off to the disk service, which signs its own
  # URL from the same request host, so a client that follows it gets bytes.
  it "serves the picture behind that URL" do
    event = create_meet(:corona_del_mar)
    picture = Rails.root.join("db/seeds/dev/images/events/dev-back-bay-sunday-cover.jpg")
    picture.open("rb") { |file| event.cover.attach(io: file, filename: "cover.jpg", content_type: "image/jpeg") }

    get "/v1/events/#{event.slug}"
    get response.parsed_body.dig("data", "cover_url")
    expect(response).to have_http_status(:found)

    follow_redirect!
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("image/jpeg")
    expect(response.body.bytesize).to eq(picture.size)
  end

  it "renders a club avatar the same way, and nil when there is none" do
    club = create(:club, slug: "harbor-motoring")
    club.avatar.attach(io: StringIO.new("jpeg bytes"), filename: "avatar.jpg", content_type: "image/jpeg", identify: false)
    bare = create(:club, slug: "inland-air")

    get "/v1/clubs/harbor-motoring"
    expect(response.parsed_body.dig("data", "avatar_url")).to start_with("http://www.example.com/rails/active_storage/")

    get "/v1/clubs/#{bare.slug}"
    expect(response.parsed_body.dig("data", "avatar_url")).to be_nil
  end
end
