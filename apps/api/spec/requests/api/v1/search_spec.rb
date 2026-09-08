require "rails_helper"

# discovery R-9: q behaves the same across events, clubs, and sponsors.
RSpec.describe "v1 search", type: :request do
  let(:lido) { "33.6172,-117.9270" }
  let(:san_diego) { "32.7157,-117.1611" }

  before do
    club = create(:club, name: "Back Bay Air-Cooled", home_location: Geo.point(33.6172, -117.9270))
    create(:sponsor, name: "Lido Coffee", home_location: Geo.point(33.6172, -117.9270))
    create_meet(:corona_del_mar, title: "Back Bay Coffee", host: club)
    create_meet(:lido, title: "Sunday Sunrise Meet")
    create(:club, name: "Inland Cruisers", home_location: Geo.point(34.1065, -117.4356))
    create(:sponsor, name: "Fontana Detailing", home_location: Geo.point(34.1065, -117.4356))
  end

  def names = json["data"].map { |row| row["name"] }

  it "AC-7: q matches by trigram on all three, and near 100 km away returns nothing" do
    get "/v1/events", params: { q: "back bay", near: san_diego }
    expect(data_titles).to eq([])
    get "/v1/clubs", params: { q: "back bay", near: san_diego }
    expect(names).to eq([])
    get "/v1/sponsors", params: { q: "lido", near: san_diego }
    expect(names).to eq([])

    get "/v1/events", params: { q: "back bay" }
    expect(data_titles).to eq([ "Back Bay Coffee" ])
  end

  it "matches the host name as well as the title on events (R-9)" do
    get "/v1/events", params: { q: "air-cooled" }
    expect(data_titles).to eq([ "Back Bay Coffee" ])
  end

  it "finds all three inside the 80 km search radius from the same origin" do
    get "/v1/events", params: { q: "back bay", near: lido }
    expect(data_titles).to eq([ "Back Bay Coffee" ])
    get "/v1/clubs", params: { q: "back bay", near: lido }
    expect(names).to eq([ "Back Bay Air-Cooled" ])
    get "/v1/sponsors", params: { q: "lido", near: lido }
    expect(names).to eq([ "Lido Coffee" ])
  end

  it "narrows with an explicit radius and rejects the same bad input everywhere" do
    get "/v1/clubs", params: { q: "back bay", near: lido, radius_km: 1 }
    expect(names).to eq([ "Back Bay Air-Cooled" ])
    get "/v1/clubs", params: { q: "inland", near: lido, radius_km: 10 }
    expect(names).to eq([])

    [ "/v1/events", "/v1/clubs", "/v1/sponsors" ].each do |path|
      get path, params: { q: "x" * 101 }
      expect(response).to have_http_status(:bad_request), "expected #{path} to reject a long q"
      get path, params: { q: "back bay", near: "91,0" }
      expect(response).to have_http_status(:bad_request), "expected #{path} to reject a bad near"
    end
  end

  it "leaves hidden and unlisted rows out of every result" do
    create(:club, :hidden, name: "Back Bay Hidden", home_location: Geo.point(33.6172, -117.9270))
    create(:sponsor, :hidden, name: "Lido Hidden", home_location: Geo.point(33.6172, -117.9270))
    create_meet(:corona_del_mar, title: "Back Bay Unlisted", visibility: "unlisted")

    get "/v1/clubs", params: { q: "back bay" }
    expect(names).to eq([ "Back Bay Air-Cooled" ])
    get "/v1/sponsors", params: { q: "lido" }
    expect(names).to eq([ "Lido Coffee" ])
    get "/v1/events", params: { q: "back bay" }
    expect(data_titles).to eq([ "Back Bay Coffee" ])
  end
end
