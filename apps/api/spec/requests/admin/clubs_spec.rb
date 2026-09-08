require "rails_helper"

# docs/specs/admin.md R-18, AC-4, AC-11; clubs.md R-3, R-23, AC-6;
# events-and-occurrences.md AC-12 (the admin rename half).
RSpec.describe "admin clubs and memberships", type: :request do
  let(:admin) { create(:user, role: "admin") }

  it "AC-4: a moderator is bounced from A05 with the role flash" do
    sign_in_moderator(create(:user, role: "moderator"))
    get "/admin/clubs"
    expect(response).to redirect_to("/admin")
    follow_redirect!
    expect(flash_text).to include("That page needs the admin role.")
  end

  context "when signed in as an admin" do
    before { sign_in_admin(admin) }

    describe "GET /admin/clubs" do
      it "lists and searches on name and slug" do
        create(:club, name: "Back Bay Air-Cooled", slug: "back-bay")
        create(:club, name: "Coast Collective", slug: "coast")

        get "/admin/clubs"
        expect(response.body).to include("Back Bay Air-Cooled", "Coast Collective")

        get "/admin/clubs", params: { q: "coast" }
        expect(response.body).to include("Coast Collective")
        expect(response.body).not_to include("Back Bay Air-Cooled")
      end
    end

    describe "POST /admin/clubs" do
      let(:attributes) do
        { name: "Harbor Air-Cooled", slug: "harbor-air-cooled", description: "Saturdays by the water.",
          home_label: "Newport Beach, CA", home_lat: "33.6172", home_lng: "-117.9270",
          join_policy: "open", status: "active", verified: "1",
          links: { instagram: "@harboraircooled", website: "https://harbor.example.com" } }
      end

      it "seats the app account as owner when no handle is given (clubs R-3)" do
        app_account = create(:app_account)

        expect { post "/admin/clubs", params: { club: attributes } }.to change(Club, :count).by(1)

        club = Club.order(:created_at).last
        expect(response).to redirect_to("/admin/clubs/#{club.id}")
        expect(club.owner).to eq(app_account)
        expect(club.home_location.y).to be_within(0.0001).of(33.6172)
        # The leading @ comes off and the six keys are validated on write.
        expect(club.links).to eq("instagram" => "harboraircooled", "website" => "https://harbor.example.com")
        expect(club.verified).to be(true)

        audit = AdminAudit.where(target_type: "Club", target_id: club.id, action: "create").sole
        expect(audit.changeset["name"]).to include("after" => "Harbor Air-Cooled")
        expect(audit.changeset["owner_handle"]).to eq("curb")
      end

      it "seats the named handle as owner instead" do
        create(:app_account)
        owner = create(:user)
        owner.profile.update!(handle: "amir", display_name: "Amir")

        post "/admin/clubs", params: { club: attributes, owner_handle: "@Amir" }

        expect(Club.order(:created_at).last.owner).to eq(owner)
      end

      it "writes nothing when the club is invalid" do
        create(:app_account)
        expect { post "/admin/clubs", params: { club: attributes.merge(name: "") } }.not_to change(Club, :count)
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include("Name can&#39;t be blank")
        expect(ClubMembership.count).to eq(0)
      end

      it "rejects a link that is not a handle for that platform" do
        create(:app_account)
        post "/admin/clubs", params: { club: attributes.merge(links: { x: "not a handle" }) }
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include("Links x is invalid")
      end
    end

    describe "PATCH /admin/clubs/:id" do
      it "clubs AC-6 and events AC-12: a rename rewrites host_name on every event it hosts" do
        club = create(:club, name: "Back Bay Air-Cooled")
        first = create(:event, :published, host: club, title: "Saturday")
        second = create(:event, :published, host: club, title: "Sunday")

        patch "/admin/clubs/#{club.id}",
              params: { club: { name: "Back Bay Aircooled", slug: club.slug, join_policy: club.join_policy,
                                status: club.status, home_lat: "33.6172", home_lng: "-117.9270" } }

        expect(response).to redirect_to("/admin/clubs/#{club.id}")
        expect(first.reload.host_name).to eq("Back Bay Aircooled")
        expect(second.reload.host_name).to eq("Back Bay Aircooled")
        expect(HostConsistencyJob.new.perform[:renamed]).to be_empty

        audit = AdminAudit.where(target_id: club.id, action: "update").recent.first
        expect(audit.changeset["name"]).to eq("before" => "Back Bay Air-Cooled", "after" => "Back Bay Aircooled")
      end
    end

    it "keeps the links a PATCH left out rather than clearing all six" do
      club = create(:club, links: { "instagram" => "backbay" })

      patch "/admin/clubs/#{club.id}",
            params: { club: { name: club.name, slug: club.slug, join_policy: club.join_policy, status: club.status } }

      expect(club.reload.links).to eq("instagram" => "backbay")
    end

    describe "the hide and verify buttons (R-18)" do
      it "hides, unhides, verifies, and unverifies, each with its own audit row" do
        club = create(:club, name: "Coast Collective")

        get "/admin/clubs/#{club.id}"
        expect(response.body).to have_button("Hide")
        expect(response.body).to have_button("Verify")

        post "/admin/clubs/#{club.id}/hide"
        expect(club.reload.status).to eq("hidden")
        post "/admin/clubs/#{club.id}/verify"
        expect(club.reload.verified).to be(true)

        get "/admin/clubs/#{club.id}"
        expect(response.body).to have_button("Unhide")
        expect(response.body).to have_button("Remove verified")

        post "/admin/clubs/#{club.id}/unhide"
        post "/admin/clubs/#{club.id}/unverify"
        club.reload
        expect(club.status).to eq("active")
        expect(club.verified).to be(false)
        expect(AdminAudit.where(target_id: club.id).pluck(:action)).to include("hide", "unhide", "verify", "unverify")
      end

      it "keeps a hidden club hosting its events (clubs R-5)" do
        club = create(:club)
        event = create(:event, :published, host: club)
        post "/admin/clubs/#{club.id}/hide"
        expect(event.reload.host_id).to eq(club.id)
        expect(event.host_name).to eq(club.name)
      end
    end

    describe "memberships" do
      it "adds by handle, changes a role, and removes" do
        club = create(:club)
        member = create(:user)
        member.profile.update!(handle: "quiet_one", display_name: "Quiet One")

        post "/admin/clubs/#{club.id}/memberships", params: { club_membership: { handle: "quiet_one", role: "admin" } }
        expect(response).to redirect_to("/admin/clubs/#{club.id}/memberships")
        membership = club.memberships.find_by(user: member)
        expect(membership.role).to eq("admin")

        patch "/admin/clubs/#{club.id}/memberships/#{membership.id}", params: { club_membership: { role: "member" } }
        expect(membership.reload.role).to eq("member")

        expect { delete "/admin/clubs/#{club.id}/memberships/#{membership.id}" }
          .to change { club.memberships.count }.by(-1)
        expect(AdminAudit.where(target_id: club.id).pluck(:action))
          .to include("membership_create", "membership_update", "membership_destroy")
      end

      it "AC-11: a second owner re-renders with the owner error and writes no row" do
        club = create(:club)
        member = create(:user)
        member.profile.update!(handle: "second")

        expect do
          post "/admin/clubs/#{club.id}/memberships", params: { club_membership: { handle: "second", role: "owner" } }
        end.not_to change { club.memberships.count }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include(Admin::Clubs::MembershipsController::OWNER_ERROR)
      end

      it "refuses to remove the last owner and says why" do
        club = create(:club)
        owner = club.owner_membership

        expect { delete "/admin/clubs/#{club.id}/memberships/#{owner.id}" }.not_to change { club.memberships.count }
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include(Admin::Clubs::MembershipsController::OWNER_ERROR)
      end

      it "reports an unknown handle without raising" do
        club = create(:club)
        post "/admin/clubs/#{club.id}/memberships", params: { club_membership: { handle: "nobody", role: "member" } }
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include("No active user with that handle.")
      end
    end
  end
end
