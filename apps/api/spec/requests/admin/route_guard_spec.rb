require "rails_helper"

# docs/specs/admin.md R-9, R-30: every route under /admin, Mission Control's
# engine routes included, bounces anonymous and member sessions.
RSpec.describe "admin route guard", type: :request do
  let(:routes) { admin_routes }

  it "enumerates the admin routes including the Mission Control engine" do
    expect(routes).to include([ "GET", "/admin" ], [ "GET", "/admin/sign_in" ], [ "POST", "/admin/session" ], [ "DELETE", "/admin/session" ])
    expect(routes).to include([ "GET", "/admin/jobs/" ], [ "POST", "/admin/jobs/applications/:application_id/jobs/:job_id/retry" ])
    expect(routes.size).to be > 20
  end

  # CSRF is off in the test environment, so an anonymous non-GET reaches the
  # session guard and must redirect too (R-30's 422 case is proven in session_spec).
  it "redirects every route to /admin/sign_in with no session, except sign_in itself (AC-1)" do
    routes.each do |verb, path|
      reset! # a fresh cookie jar per route: a refused POST /admin/session leaves a flash cookie behind
      process(verb.downcase.to_sym, concrete_path(path))
      if verb == "GET" && path == "/admin/sign_in"
        expect(response).to have_http_status(:ok), "#{verb} #{path} expected 200, got #{response.status}"
      else
        expect(response).to redirect_to("/admin/sign_in"), "#{verb} #{path} expected 302 to /admin/sign_in, got #{response.status}"
      end
      expect(response.headers["Set-Cookie"]).to be_nil, "#{verb} #{path} set a cookie for an anonymous request" if verb == "GET"
    end
  end

  it "writes a session cookie the app reads back (positive control for the member sweep)" do
    set_admin_session(create(:user, role: "admin"))
    get "/admin"
    expect(response).to have_http_status(:ok)
  end

  it "redirects every route to /admin/sign_in for a member session and drops the session (AC-2)" do
    member = create(:user, role: "member")
    routes.each do |verb, path|
      set_admin_session(member)
      process(verb.downcase.to_sym, concrete_path(path))
      if verb == "GET" && path == "/admin/sign_in"
        expect(response).to have_http_status(:ok)
      else
        expect(response).to redirect_to("/admin/sign_in"), "#{verb} #{path} expected 302 to /admin/sign_in, got #{response.status}"
      end
      expect(admin_session_user_id).to be_nil, "#{verb} #{path} left an admin session for a member"
    end
  end

  it "redirects every Mission Control route to /admin for a moderator (R-12)" do
    sign_in_moderator(create(:user, role: "moderator"))
    routes.select { |_verb, path| path.start_with?("/admin/jobs") }.each do |verb, path|
      process(verb.downcase.to_sym, concrete_path(path))
      expect(response).to redirect_to("/admin"), "#{verb} #{path} expected 302 to /admin, got #{response.status}"
    end
  end

  it "drops a session whose user was suspended or demoted since sign-in" do
    admin = create(:user, role: "admin")
    sign_in_admin(admin)
    get "/admin"
    expect(response).to have_http_status(:ok)

    admin.update!(status: "suspended")
    get "/admin"
    expect(response).to redirect_to("/admin/sign_in")
  end
end
