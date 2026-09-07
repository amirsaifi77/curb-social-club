require "rails_helper"

# docs/specs/admin.md R-7, R-8, R-5, R-1: A01 sign-in, sign-out, CSRF, audit.
RSpec.describe "admin session", type: :request do
  let(:admin) { create(:user, role: "admin") }

  describe "GET /admin/sign_in" do
    it "renders the Google Identity Services button, the credential form, and the /admin CSP" do
      get "/admin/sign_in"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("curb admin")
      expect(response.body).to include('src="https://accounts.google.com/gsi/client"')
      expect(response.body).to include('data-client_id="' + Auth::Config.google_admin_client_id + '"')
      expect(response.body).to include('data-callback="curbAdminCredential"')
      expect(response.body).to include('class="g_id_signin"')
      expect(response.body).to include('id="admin-session-form"')
      expect(response.body).to include('name="credential"')
      expect(response.body).not_to match(/<script(?![^>]*src=)/)

      csp = response.headers["Content-Security-Policy"]
      expect(csp).to include("script-src 'self' https://accounts.google.com")
      expect(csp).to include("frame-src https://accounts.google.com")
      expect(csp).not_to include("unsafe-inline")
      expect(response.headers["Set-Cookie"]).to be_nil
    end

    it "sends a signed-in admin to the dashboard" do
      sign_in_admin(admin)
      get "/admin/sign_in"
      expect(response).to redirect_to("/admin")
    end
  end

  describe "POST /admin/session" do
    it "signs in an admin, refuses a member, refuses a bad token (AC-3)" do
      member = create(:user, role: "member")

      post "/admin/session", params: { credential: admin_google_token(admin) }
      expect(response).to redirect_to("/admin")
      expect(response.headers["Set-Cookie"]).to include("_curb_admin=")
      expect(response.headers["Set-Cookie"]).to include("httponly")
      expect(response.headers["Set-Cookie"]).to include("samesite=lax")
      expect(admin_session_user_id).to eq(admin.id)
      audit = AdminAudit.recent.first
      expect(audit).to have_attributes(admin_id: admin.id, action: "sign_in", target_type: "User", target_id: admin.id)
      expect(audit.ip).to be_present
      follow_redirect!
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Dashboard")

      reset!
      post "/admin/session", params: { credential: admin_google_token(member) }
      expect(response).to redirect_to("/admin/sign_in")
      expect(admin_session_user_id).to be_nil
      refused = AdminAudit.where(action: "sign_in_refused").sole
      expect(refused).to have_attributes(admin_id: nil, target_id: member.id)
      expect(refused.changeset["sub"]).to eq(member.identities.sole.provider_uid)
      follow_redirect!
      expect(flash_text).to include("This Google account is not an admin.")
      get "/admin"
      expect(response).to redirect_to("/admin/sign_in")

      reset!
      post "/admin/session", params: { credential: admin_google_token(admin, aud: "someone-else") }
      expect(response).to redirect_to("/admin/sign_in")
      expect(admin_session_user_id).to be_nil
      follow_redirect!
      expect(flash_text).to include("Couldn't verify that sign-in. Try again.")
      expect(AdminAudit.where(action: "sign_in").count).to eq(1)
      expect(AdminAudit.count).to eq(2)
    end

    it "never stores or logs the credential, even for a signed-in admin posting a bad one" do
      sign_in_admin(admin)
      post "/admin/session", params: { credential: "not-a-token" }
      expect(response).to redirect_to("/admin/sign_in")
      expect(AdminAudit.pluck(:changeset).to_json).not_to include("not-a-token")
      expect(request.filtered_parameters["credential"]).to eq("[FILTERED]")

      post "/admin/session", params: { credential: [ "x" ] }
      expect(response).to redirect_to("/admin/sign_in")
      expect(flash[:alert]).to eq("Couldn't verify that sign-in. Try again.")
    end

    it "refuses an unknown identity, a suspended admin, and a missing credential" do
      post "/admin/session", params: { credential: google_token(sub: "nobody", aud: Auth::Config.google_admin_client_id) }
      expect(response).to redirect_to("/admin/sign_in")
      expect(flash[:alert]).to eq("This Google account is not an admin.")

      suspended = create(:user, role: "admin", status: "suspended")
      post "/admin/session", params: { credential: admin_google_token(suspended) }
      expect(response).to redirect_to("/admin/sign_in")
      expect(flash[:alert]).to eq("This Google account is not an admin.")
      expect(admin_session_user_id).to be_nil

      post "/admin/session"
      expect(response).to redirect_to("/admin/sign_in")
      expect(flash[:alert]).to eq("Couldn't verify that sign-in. Try again.")
    end

    it "replaces an existing session rather than reusing it (R-7 reset_session)" do
      moderator = create(:user, role: "moderator")
      sign_in_moderator(moderator)
      first_cookie = cookies["_curb_admin"]
      post "/admin/session", params: { credential: admin_google_token(admin) }
      expect(response).to redirect_to("/admin")
      expect(admin_session_user_id).to eq(admin.id)
      expect(cookies["_curb_admin"]).not_to eq(first_cookie)
    end
  end

  describe "DELETE /admin/session" do
    it "rejects the request without the CSRF token and signs out with it, auditing both ends (AC-5)" do
      sign_in_admin(admin)
      with_forgery_protection do
        delete "/admin/session"
        expect(response).to have_http_status(:unprocessable_content)
        expect(AdminAudit.where(action: "sign_out")).not_to exist

        get "/admin"
        token = csrf_token_from(response.body)
        expect(token).to be_present
        delete "/admin/session", params: { authenticity_token: token }
        expect(response).to redirect_to("/admin/sign_in")
      end
      expect(admin_session_user_id).to be_nil
      expect(AdminAudit.where(action: "sign_out")).to exist
      sign_out = AdminAudit.where(action: "sign_out").sole
      expect(sign_out).to have_attributes(admin_id: admin.id, target_id: admin.id)
      expect(sign_out.ip).to be_present
      follow_redirect!
      expect(flash_text).to include("Signed out.")
      get "/admin"
      expect(response).to redirect_to("/admin/sign_in")
    end

    it "lets a moderator sign out" do
      moderator = create(:user, role: "moderator")
      sign_in_moderator(moderator)
      delete "/admin/session"
      expect(response).to redirect_to("/admin/sign_in")
      expect(admin_session_user_id).to be_nil
    end
  end
end
