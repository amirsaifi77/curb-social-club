require "rails_helper"

# docs/specs/admin.md R-14, R-26, AC-23: A03 venues.
RSpec.describe "admin venues", type: :request do
  let(:admin) { create(:user, role: "admin") }

  def pager_hrefs = Nokogiri::HTML(response.body).css(".pager a").map { |link| link["href"] }

  it "AC-4: a moderator is bounced from A03 with the role flash" do
    sign_in_moderator(create(:user, role: "moderator"))
    get "/admin/venues"
    expect(response).to redirect_to("/admin")
    follow_redirect!
    expect(flash_text).to include("That page needs the admin role.")
  end

  context "when signed in as an admin" do
      before { sign_in_admin(admin) }

    describe "GET /admin/venues" do
      it "lists venues, searches name and city, and pages at 50" do
        create(:venue, name: "Lido Marina Village", city: "Newport Beach")
        create(:venue, name: "Sierra at Foothill", city: "Fontana")

        get "/admin/venues"
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Lido Marina Village", "Sierra at Foothill")

        get "/admin/venues", params: { q: "fontana" }
        expect(response.body).to include("Sierra at Foothill")
        expect(response.body).not_to include("Lido Marina Village")

        get "/admin/venues", params: { q: "lido" }
        expect(response.body).to include("Lido Marina Village")
      end

      it "shows the empty copy on a fresh database" do
        get "/admin/venues"
        expect(response.body).to include("Nothing here yet.")
      end

      it "pages at 50, keeps the search, and ignores a reserved key in the query string" do
        60.times { |i| create(:venue, name: "Venue #{format('%02d', i)}", city: "Newport Beach") }

        get "/admin/venues"
        expect(Nokogiri::HTML(response.body).css("table.list tbody tr").size).to eq(50)
        expect(response.body).to include("1 to 50 of 60")
        expect(pager_hrefs).to eq([ "/admin/venues?page=2" ])

        get "/admin/venues", params: { page: 2 }
        expect(Nokogiri::HTML(response.body).css("table.list tbody tr").size).to eq(10)

        get "/admin/venues", params: { q: "Newport" }
        expect(pager_hrefs.first).to include("q=Newport")

        # url_for treats these as routing options, so forwarding the request's
        # own query would rewrite the link or raise.
        { "host" => "evil.example.com", "controller" => "nope", "action" => "destroy",
          "script_name" => "/x", "protocol" => "javascript" }.each do |key, value|
          get "/admin/venues", params: { key => value }
          expect(response).to have_http_status(:ok), "#{key} broke the list"
          expect(pager_hrefs).to eq([ "/admin/venues?page=2" ]), "#{key} reached url_for"
        end
      end
  end

  describe "POST /admin/venues" do
    let(:attributes) do
      { name: "Back Bay Coffee", address_line1: "1 Bayside Dr", city: "Newport Beach", region: "CA",
        postal_code: "92660", country: "US", lat: "33.6172", lng: "-117.9270",
        timezone: "America/Los_Angeles", external_source: "manual" }
    end

    it "creates the venue with the point and one audit row (AC-23)" do
      expect { post "/admin/venues", params: { venue: attributes } }.to change(Venue, :count).by(1)

      venue = Venue.order(:created_at).last
      expect(response).to redirect_to("/admin/venues/#{venue.id}")
      expect(venue.location.y).to be_within(0.0001).of(33.6172)
      expect(venue.location.x).to be_within(0.0001).of(-117.9270)
      expect(venue.created_by).to eq(admin)

      audit = AdminAudit.where(target_type: "Venue", target_id: venue.id).recent.first
      expect(audit.action).to eq("create")
      expect(audit.admin_id).to eq(admin.id)
      expect(audit.changeset["name"]).to include("after" => "Back Bay Coffee")
      expect(audit.ip).to be_present
    end

    it "re-renders the form with the errors when the point is missing" do
      post "/admin/venues", params: { venue: attributes.merge(lat: "", lng: "") }
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Location can&#39;t be blank")
      expect(response.body).to have_field("venue[name]", with: "Back Bay Coffee")
    end
  end

  describe "PATCH /admin/venues/:id" do
    it "saves the change, moves future occurrences, and audits before and after" do
      venue = create(:venue, name: "Old name")
      event = create(:event, :published, venue: venue)
      occurrence = create(:event_occurrence, event: event, starts_at: 3.days.from_now)

      patch "/admin/venues/#{venue.id}",
            params: { venue: { name: "New name", country: "US", timezone: venue.timezone,
                               external_source: "manual", lat: "34.0", lng: "-118.0" } }

      expect(response).to redirect_to("/admin/venues/#{venue.id}")
      expect(venue.reload.name).to eq("New name")
      expect(occurrence.reload.location.y).to be_within(0.0001).of(34.0)
      audit = AdminAudit.where(target_type: "Venue", target_id: venue.id).recent.first
      expect(audit.action).to eq("update")
      expect(audit.changeset["name"]).to eq("before" => "Old name", "after" => "New name")
      expect(audit.changeset).not_to have_key("updated_at")
    end
  end

  describe "GET and DELETE /admin/venues/:id" do
    it "shows the venue with its upcoming events and refuses to delete while they exist" do
      venue = create(:venue, name: "Lido Marina Village")
      event = create(:event, :published, venue: venue, title: "Saturday meet")
      create(:event_occurrence, event: event, starts_at: 3.days.from_now)

      get "/admin/venues/#{venue.id}"
      expect(response.body).to include("Saturday meet")
      expect(response.body).to include("A venue with events cannot be deleted.")

      expect { delete "/admin/venues/#{venue.id}" }.not_to change(Venue, :count)
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Upcoming events here")
    end

    it "still blocks the delete when every event at the venue is in the past" do
      venue = create(:venue, name: "Old lot")
      past = create(:event, :published, venue: venue, title: "Last summer")
      create(:event_occurrence, event: past, starts_at: 40.days.ago, status: "completed")

      get "/admin/venues/#{venue.id}"
      expect(response.body).not_to have_button("Delete venue")
      expect(response.body).to include("1 event")
      expect { delete "/admin/venues/#{venue.id}" }.not_to change(Venue, :count)
    end

    it "deletes a venue with no events" do
      venue = create(:venue)
      get "/admin/venues/#{venue.id}"
      expect(response.body).to have_button("Delete venue")

      expect { delete "/admin/venues/#{venue.id}" }.to change(Venue, :count).by(-1)
      expect(response).to redirect_to("/admin/venues")
      expect(AdminAudit.recent.first.action).to eq("destroy")
    end
  end
  end
end
