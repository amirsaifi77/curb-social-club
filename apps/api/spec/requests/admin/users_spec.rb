require "rails_helper"

# docs/specs/admin.md R-3, R-4, R-9, R-22, AC-4, AC-14, AC-15.
RSpec.describe "admin users", type: :request do
  let(:admin) { create(:user, role: "admin", email: "amir@example.com") }
  let(:moderator) { create(:user, role: "moderator") }

  def handled(user, handle)
    user.profile.update!(handle: handle, display_name: handle.titleize)
    user
  end

  describe "as an admin" do
    before { sign_in_admin(admin) }

    it "lists and searches on handle and email" do
      handled(create(:user, email: "quiet@example.com"), "quiet_one")
      handled(create(:user, email: "loud@example.com"), "loud_one")

      get "/admin/users"
      expect(response.body).to include("quiet_one", "loud_one")

      get "/admin/users", params: { q: "quiet_one" }
      expect(response.body).to include("quiet_one")
      expect(response.body).not_to include("loud_one")

      get "/admin/users", params: { q: "loud@example" }
      expect(response.body).to include("loud_one")
      expect(response.body).not_to include("quiet_one")
    end

    it "shows identities, the session count, the role, and hosted events (R-22)" do
      user = handled(create(:user, email: "quiet@example.com"), "quiet_one")
      create(:identity, user: user)
      create(:identity, :apple, user: user)
      create_list(:session, 2, user: user)
      event = create(:event, :published, host: user, title: "Saturday meet")

      get "/admin/users/#{user.id}"
      expect(response.body).to include("quiet_one", "quiet@example.com", "google", "apple", "Saturday meet")
      expect(Nokogiri::HTML(response.body).at("th:contains('Sessions') + td").text.strip).to eq("2")
      expect(event.host_name).to eq("Quiet One")
    end

    it "AC-14 (role half): an admin cannot change their own role and sees why" do
      get "/admin/users/#{admin.id}"
      expect(response.body).to include("You can't change your own role.")
      expect(response.body).not_to have_select("user[role]")

      patch "/admin/users/#{admin.id}/role", params: { user: { role: "member" } }
      expect(response).to redirect_to("/admin/users/#{admin.id}")
      follow_redirect!
      expect(flash_text).to include("You can't change your own role.")
      expect(admin.reload.role).to eq("admin")
    end

    it "changes another user's role with an audit row" do
      user = handled(create(:user), "quiet_one")

      patch "/admin/users/#{user.id}/role", params: { user: { role: "moderator" } }

      expect(user.reload.role).to eq("moderator")
      audit = AdminAudit.where(target_type: "User", target_id: user.id, action: "role").sole
      expect(audit.changeset["role"]).to eq("before" => "member", "after" => "moderator")
    end

    it "ignores a role that is not a role rather than raising" do
      user = handled(create(:user), "quiet_one")
      patch "/admin/users/#{user.id}/role", params: { user: { role: "superuser" } }
      expect(user.reload.role).to eq("member")
    end

    it "refuses to re-run an action on an account already deleted" do
      user = handled(create(:user, status: "deleted", deleted_at: 2.days.ago), "gone_one")
      # From the database, so the comparison is at the column's precision.
      was = user.reload.deleted_at

      post "/admin/users/#{user.id}/suspend"
      expect(response).to redirect_to("/admin/users/#{user.id}")
      delete "/admin/users/#{user.id}"
      follow_redirect!
      expect(flash_text).to include("That account is already deleted.")

      user.reload
      expect(user.status).to eq("deleted")
      # The purge clock does not restart.
      expect(user.deleted_at).to eq(was)
    end

    it "AC-15: delete runs the DELETE /me path, never a raw destroy (R-4)" do
      user = handled(create(:user), "quiet_one")
      create_list(:session, 2, user: user)
      device = create(:device, user: user)

      expect do
        expect { delete "/admin/users/#{user.id}" }.not_to change(User, :count)
      end.to have_enqueued_job(AccountDeletionJob).with(user.id)

      user.reload
      expect(user.status).to eq("deleted")
      expect(user.deleted_at).to be_present
      expect(user.sessions.count).to eq(0)
      expect(device.reload.user_id).to be_nil
      expect(AdminAudit.where(target_id: user.id, action: "destroy")).to exist
    end
  end

  describe "as a moderator (R-9)" do
    before { sign_in_moderator(moderator) }

    it "AC-4: sees the list and a user, and AC-14: suspends with the sessions gone in one transaction" do
      user = handled(create(:user), "quiet_one")
      create_list(:session, 2, user: user)

      get "/admin/users"
      expect(response).to have_http_status(:ok)

      get "/admin/users/#{user.id}"
      expect(response).to have_http_status(:ok)
      # R-22: only an admin sees the role control.
      expect(response.body).not_to have_select("user[role]")
      expect(response.body).not_to have_button("Delete account")
      expect(response.body).to have_button("Suspend")
      confirm = Nokogiri::HTML(response.body).at("button[data-confirm]")["data-confirm"]
      expect(confirm).to eq("Suspend quiet_one? Their sessions end now and they can't sign in.")

      post "/admin/users/#{user.id}/suspend"
      user.reload
      expect(user.status).to eq("suspended")
      expect(user.sessions.count).to eq(0)
      expect(AdminAudit.where(target_id: user.id, action: "suspend", admin_id: moderator.id)).to exist

      get "/admin/users/#{user.id}"
      expect(response.body).to have_button("Unsuspend")
      post "/admin/users/#{user.id}/unsuspend"
      expect(user.reload.status).to eq("active")
    end

    it "cannot change a role or delete, and is sent back with the role flash" do
      user = handled(create(:user), "quiet_one")

      patch "/admin/users/#{user.id}/role", params: { user: { role: "admin" } }
      expect(response).to redirect_to("/admin")
      expect(user.reload.role).to eq("member")

      delete "/admin/users/#{user.id}"
      expect(response).to redirect_to("/admin")
      expect(user.reload.status).to eq("active")
      follow_redirect!
      expect(flash_text).to include("That page needs the admin role.")
    end
  end
end
