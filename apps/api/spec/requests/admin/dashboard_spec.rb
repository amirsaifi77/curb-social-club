require "rails_helper"

# docs/specs/admin.md R-9, R-12, R-13 (Phase 0 skeleton): A02 and A12.
RSpec.describe "admin dashboard and jobs", type: :request do
  let(:admin) { create(:user, role: "admin") }
  let(:moderator) { create(:user, role: "moderator") }

  def count_for(label)
    Nokogiri::HTML(response.body).at("th:contains('#{label}') + td").text.strip
  end

  # The nav also links /admin/events, so this asks for the one in the seed
  # decay paragraph by its text.
  def stale_link
    Nokogiri::HTML(response.body).css("a").find { |link| link.text.include?("not confirmed in 30 days") }&.[]("href")
  end

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

  it "AC-21: the counts match the models, the report is shown, and the stale row links to A04 filtered" do
    # The test environment's cache is a null store, so the report the job
    # writes has somewhere to live.
    allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
    venue = create(:venue)
    published = create(:event, :published, venue: venue, title: "Saturday")
    create(:event, venue: venue, title: "A draft")
    create(:event_occurrence, event: published, starts_at: 3.days.from_now)
    create(:event_occurrence, event: published, starts_at: 40.days.from_now)
    create(:club)
    create(:club, :hidden)
    create(:sponsor)
    stale = create(:event, :published, venue: venue, title: "Stale one", last_confirmed_at: 40.days.ago)
    create(:event, :published, venue: venue, title: "Stale two", last_confirmed_at: 45.days.ago)
    create(:event, :published, venue: venue, title: "Dormant one", dormant_at: 1.day.ago, last_confirmed_at: 100.days.ago)
    HostConsistencyJob.perform_now

    sign_in_admin(admin)
    get "/admin"

    expect(response).to have_http_status(:ok)
    expect(count_for("Published events")).to eq(Event.published.count.to_s)
    expect(count_for("Scheduled dates in the next 14 days")).to eq("1")
    expect(count_for("Venues")).to eq(Venue.count.to_s)
    expect(count_for("Active clubs")).to eq("1")
    expect(count_for("Active sponsors")).to eq("1")
    expect(count_for("Users")).to eq(User.active.count.to_s)

    expect(response.body).to include("2 unclaimed meets not confirmed in 30 days")
    expect(response.body).to include("1 hidden after 90")
    # The Copy table says "hidden", not "hiddens", at every count.
    expect(response.body).not_to include("hiddens")
    expect(stale_link).to include("stale=1")

    expect(response.body).to include("Host consistency")
    expect(response.body).not_to include("No run yet")
  end

  it "AC-21: the three nightly tasks show their last run" do
    now = Time.utc(2026, 9, 7, 9, 0)
    %w[materialize_occurrences host_consistency seed_decay].each do |key|
      SolidQueue::RecurringTask.create!(key: key, schedule: "0 2 * * *", class_name: key.camelize + "Job", static: true)
    end
    sign_in_admin(admin)
    travel_to(now) { get "/admin" }

    rows = Nokogiri::HTML(response.body).css("table.list tbody tr").map(&:text)
    expect(rows.size).to eq(3)
    expect(rows.join).to include("materialize_occurrences", "host_consistency", "seed_decay")
    # No execution rows yet, so every task reads the same way rather than blank.
    expect(rows.map { |row| row.include?("No run yet") }).to all(be(true))
  end

  it "says No run yet rather than failing when the consistency job has not run" do
    Rails.cache.delete(HostConsistencyJob::REPORT_KEY)
    sign_in_admin(admin)
    get "/admin"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("No run yet")
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
