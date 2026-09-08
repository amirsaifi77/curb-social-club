require "rails_helper"

# docs/specs/admin.md R-19; sponsors.md R-20, AC-7.
RSpec.describe "admin sponsors", type: :request do
  let(:admin) { create(:user, role: "admin") }

  it "AC-4: a moderator is bounced from A06 with the role flash" do
    sign_in_moderator(create(:user, role: "moderator"))
    get "/admin/sponsors"
    expect(response).to redirect_to("/admin")
    follow_redirect!
    expect(flash_text).to include("That page needs the admin role.")
  end

  context "when signed in as an admin" do
    before { sign_in_admin(admin) }

    it "lists and searches on name and slug" do
      create(:sponsor, name: "Bear Coast Coffee", slug: "bear-coast")
      create(:sponsor, name: "Apex Detail", slug: "apex-detail")

      get "/admin/sponsors"
      expect(response.body).to include("Bear Coast Coffee", "Apex Detail")

      get "/admin/sponsors", params: { q: "apex" }
      expect(response.body).to include("Apex Detail")
      expect(response.body).not_to include("Bear Coast Coffee")
    end

    it "creates a sponsor with every field in R-19" do
      expect do
        post "/admin/sponsors", params: { sponsor: {
          name: "Bear Coast Coffee", slug: "bear-coast", kind: "vendor", tagline: "Pour-over from the cart",
          description: "A cart at the north end most Saturdays.", website: "https://bearcoast.example.com",
          home_label: "Newport Beach, CA", home_lat: "33.6172", home_lng: "-117.9270",
          status: "active", verified: "1", links: { instagram: "bearcoast", x: "bearcoast" }
        } }
      end.to change(Sponsor, :count).by(1)

      sponsor = Sponsor.order(:created_at).last
      expect(response).to redirect_to("/admin/sponsors/#{sponsor.id}")
      expect(sponsor.kind).to eq("vendor")
      expect(sponsor.verified).to be(true)
      expect(sponsor.home_location.y).to be_within(0.0001).of(33.6172)
      expect(sponsor.links).to eq("instagram" => "bearcoast", "x" => "bearcoast")
      expect(AdminAudit.where(target_type: "Sponsor", target_id: sponsor.id, action: "create")).to exist
    end

    it "re-renders with the model's message on a bad website" do
      post "/admin/sponsors", params: { sponsor: { name: "Bad", kind: "brand", status: "active", website: "bearcoast.example.com" } }
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("must start with http:// or https://")
    end

    it "sponsors AC-7: a rename rewrites host_name on every event the sponsor hosts" do
      sponsor = create(:sponsor, name: "Bear Coast Coffee")
      hosted = create(:event, :published, host: sponsor, title: "Saturday")

      patch "/admin/sponsors/#{sponsor.id}",
            params: { sponsor: { name: "Bear Coast", slug: sponsor.slug, kind: sponsor.kind, status: sponsor.status } }

      expect(hosted.reload.host_name).to eq("Bear Coast")
      expect(HostConsistencyJob.new.perform[:renamed]).to be_empty
      audit = AdminAudit.where(target_id: sponsor.id, action: "update").recent.first
      expect(audit.changeset["name"]).to eq("before" => "Bear Coast Coffee", "after" => "Bear Coast")
    end

    it "shows hosted and sponsored events apart (R-19)" do
      sponsor = create(:sponsor, name: "Bear Coast")
      hosted = create(:event, :published, host: sponsor, title: "Hosted meet")
      attached = create(:event, :published, title: "Sponsored meet")
      create(:event_sponsorship, event: attached, sponsor: sponsor)

      get "/admin/sponsors/#{sponsor.id}"
      body = Nokogiri::HTML(response.body)
      hosted_table = body.css("h2:contains('Events hosted') + table").text
      sponsored_table = body.css("h2:contains('Events sponsored') + table").text
      expect(hosted_table).to include(hosted.title)
      expect(hosted_table).not_to include(attached.title)
      expect(sponsored_table).to include(attached.title)
    end

    it "hides, unhides, verifies, and unverifies with audit rows, and keeps hosting" do
      sponsor = create(:sponsor, name: "Bear Coast")
      event = create(:event, :published, host: sponsor)

      post "/admin/sponsors/#{sponsor.id}/hide"
      expect(sponsor.reload.status).to eq("hidden")
      expect(event.reload.host_id).to eq(sponsor.id)

      post "/admin/sponsors/#{sponsor.id}/verify"
      post "/admin/sponsors/#{sponsor.id}/unhide"
      post "/admin/sponsors/#{sponsor.id}/unverify"
      sponsor.reload
      expect(sponsor.status).to eq("active")
      expect(sponsor.verified).to be(false)
      expect(AdminAudit.where(target_id: sponsor.id).pluck(:action)).to include("hide", "unhide", "verify", "unverify")
    end
  end
end
