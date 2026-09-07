require "rails_helper"

# docs/specs/admin.md R-9, R-12, R-13 (Phase 0 skeleton): A02 and A12.
RSpec.describe "admin dashboard and jobs", type: :request do
  let(:admin) { create(:user, role: "admin") }
  let(:moderator) { create(:user, role: "moderator") }

  it "renders counts and job health for an admin with a link to Jobs" do
    create(:user, status: "suspended")
    sign_in_admin(admin)
    get "/admin"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Dashboard")
    expect(response.body).to include("Users")
    expect(response.body).to include("Failed")
    expect(response.body).to include("Recurring tasks")
    expect(response.body).to include('href="/admin/jobs/"')
    expect(response.body).to include("Sign out")
    expect(response.body).to include(admin.email)
  end

  it "lets a moderator see the dashboard and bounces them from Jobs with the role flash (AC-4)" do
    sign_in_moderator(moderator)
    get "/admin"
    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include("/admin/jobs")
    expect(response.body).not_to include("Open Jobs")

    get "/admin/jobs"
    expect(response).to redirect_to("/admin")
    follow_redirect!
    expect(flash_text).to include("That page needs the admin role.")

    get "/admin/jobs/queues"
    expect(response).to redirect_to("/admin")
  end

  it "renders Mission Control for an admin with the nonce-carrying CSP (R-12)" do
    sign_in_admin(admin)
    get "/admin/jobs"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Mission control")
    expect(response.body).to include('type="importmap"')
    csp = response.headers["Content-Security-Policy"]
    expect(csp).to match(/script-src 'self' https:\/\/accounts\.google\.com 'nonce-[^']+'/)
    nonce = csp[/'nonce-([^']+)'/, 1]
    expect(response.body).to include(%(nonce="#{nonce}"))

    get "/admin/jobs/queues"
    expect(response).to have_http_status(:ok)
  end

  it "audits a Mission Control write generically (R-1)" do
    SolidQueue::Job.enqueue(SessionSweepJob.new) # so the default queue exists
    sign_in_admin(admin)
    get "/admin/jobs"
    application = Nokogiri::HTML(response.body).css("a[href*='/admin/jobs/applications/']").first
    app_id = application["href"][%r{/admin/jobs/applications/([^/]+)}, 1]
    expect(app_id).to be_present

    post "/admin/jobs/applications/#{app_id}/queues/default/pause"
    expect(response).to have_http_status(:redirect)
    expect(SolidQueue::Pause.where(queue_name: "default")).to exist
    audit = AdminAudit.where(action: "mission_control/jobs/queues/pauses#create").sole
    expect(audit.admin_id).to eq(admin.id)
    expect(audit.changeset.dig("params", "queue_id")).to eq("default")
  end
end
