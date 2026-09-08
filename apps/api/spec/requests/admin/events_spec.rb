require "rails_helper"

# docs/specs/admin.md R-15, R-16, AC-7, AC-8, AC-10.
RSpec.describe "admin events", type: :request do
  let(:admin) { create(:user, role: "admin") }
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  before { sign_in_admin(admin) }

  # Every field the form sends, so a test that changes one attribute does
  # not blank the rest.
  def form_params(event, **overrides)
    { title: event.title, slug: event.slug, description: event.description,
      host: Admin::HostPicker.value(event.host_type, event.host_id), venue_id: event.venue_id,
      cadence: event.cadence, timezone: event.timezone, duration_minutes: event.duration_minutes,
      rrule: event.rrule, status: event.status, visibility: event.visibility,
      rsvp_mode: event.rsvp_mode, tags: event.tags + [ "" ],
      dtstart_local: event.dtstart&.in_time_zone(event.timezone)&.strftime("%Y-%m-%dT%H:%M") }.merge(overrides)
  end

  describe "GET /admin/events" do
    it "filters on status, host type, claimed, stale, dormant, and q" do
      club_meet = create(:event, :published, :club_host, title: "Club meet")
      draft = create(:event, title: "Draft meet")
      stale = create(:event, :published, title: "Stale meet", last_confirmed_at: 40.days.ago)
      dormant = create(:event, :published, title: "Dormant meet", dormant_at: 1.day.ago)
      claimed = create(:event, :published, title: "Claimed meet", claimed_at: 1.day.ago)

      get "/admin/events"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include(club_meet.title, draft.title, stale.title, dormant.title, claimed.title)

      get "/admin/events", params: { status: "draft" }
      expect(response.body).to include("Draft meet")
      expect(response.body).not_to include("Club meet")

      get "/admin/events", params: { host_type: "Club" }
      expect(response.body).to include("Club meet")
      expect(response.body).not_to include("Draft meet")

      get "/admin/events", params: { claimed: "yes" }
      expect(response.body).to include("Claimed meet")
      expect(response.body).not_to include("Club meet")

      get "/admin/events", params: { stale: "1" }
      expect(response.body).to include("Stale meet")
      expect(response.body).not_to include("Claimed meet")

      get "/admin/events", params: { dormant: "1" }
      expect(response.body).to include("Dormant meet")
      expect(response.body).not_to include("Stale meet")

      get "/admin/events", params: { q: "club" }
      expect(response.body).to include("Club meet")
      expect(response.body).not_to include("Draft meet")
    end

    it "ignores a filter value it does not know rather than raising" do
      create(:event, :published, title: "Saturday meet")
      get "/admin/events", params: { status: "nope", host_type: "Robot", claimed: "maybe" }
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Saturday meet")
    end
  end

  describe "PATCH /admin/events/:id" do
    it "AC-7: an rrule change keeps host_name, enqueues the materializer once, clears dormant_at, and audits" do
      event = create(:event, :published, :weekly, :club_host, dormant_at: 2.days.ago)
      host_name = event.host_name

      expect do
        patch "/admin/events/#{event.id}", params: { event: form_params(event, rrule: "FREQ=WEEKLY;BYDAY=SU") }
      end.to have_enqueued_job(MaterializeOccurrencesJob).with(event.id).exactly(:once)

      expect(response).to redirect_to("/admin/events/#{event.id}/edit")
      event.reload
      expect(event.rrule).to eq("FREQ=WEEKLY;BYDAY=SU")
      expect(event.host_name).to eq(host_name)
      expect(event.dormant_at).to be_nil

      audit = AdminAudit.where(target_type: "Event", target_id: event.id, action: "update").recent.first
      expect(audit.changeset["rrule"]).to eq("before" => "FREQ=WEEKLY;BYDAY=SA", "after" => "FREQ=WEEKLY;BYDAY=SU")
    end

    it "reads dtstart as wall clock in the event timezone" do
      event = create(:event, :published)
      patch "/admin/events/#{event.id}", params: { event: form_params(event, dtstart_local: "2026-11-07T07:30") }
      expect(event.reload.dtstart).to eq(zone.parse("2026-11-07 07:30"))
    end

    it "writes host_type, host_id, and host_name from the one host picker" do
      event = create(:event, :published)
      club = create(:club, name: "Coast Collective")

      patch "/admin/events/#{event.id}",
            params: { event: form_params(event, host: Admin::HostPicker.value("Club", club.id)) }

      event.reload
      expect(event.host_type).to eq("Club")
      expect(event.host_id).to eq(club.id)
      expect(event.host_name).to eq("Coast Collective")
    end

    it "keeps a host who is not marked a host in the picker, so the form shows the truth" do
      user = create(:user)
      user.profile.update!(display_name: "Quiet Organizer", is_host: false)
      event = create(:event, :published, host: user)

      get "/admin/events/#{event.id}/edit"
      selected = Nokogiri::HTML(response.body).at("select[name='event[host]'] option[selected]")
      expect(selected&.text).to eq("Quiet Organizer (@#{user.profile.handle})")
    end

    it "AC-10: a claimed event locks the host fields and audits a crafted change as skipped" do
      club = create(:club, name: "Original club")
      event = create(:event, :published, host: club, claimed_at: 3.days.ago)
      other = create(:club, name: "Someone else")

      get "/admin/events/#{event.id}/edit"
      expect(response.body).to include("Claimed by Original club on")
      expect(response.body).to include("Host fields are locked; change ownership through a claim.")
      expect(response.body).to have_select("event[host]", disabled: true)

      patch "/admin/events/#{event.id}",
            params: { event: form_params(event, host: Admin::HostPicker.value("Club", other.id), title: "Renamed") }

      event.reload
      expect(event.host_id).to eq(club.id)
      expect(event.host_name).to eq("Original club")
      expect(event.title).to eq("Renamed")
      skipped = AdminAudit.where(target_type: "Event", target_id: event.id, action: "skipped_locked_fields").recent.first
      expect(skipped.changeset["skipped"]).to eq([ "host" ])
    end

    it "locks the slug once the event is published" do
      event = create(:event, :published, slug: "lido-saturday")

      get "/admin/events/#{event.id}/edit"
      expect(response.body).to have_field("event[slug]", disabled: true)

      patch "/admin/events/#{event.id}", params: { event: form_params(event, slug: "something-else") }
      expect(event.reload.slug).to eq("lido-saturday")
      expect(AdminAudit.where(action: "skipped_locked_fields").recent.first.changeset["skipped"]).to eq([ "slug" ])
    end

    it "re-renders with the model's message when the rrule is not a rule" do
      event = create(:event, :published, :weekly)
      patch "/admin/events/#{event.id}", params: { event: form_params(event, rrule: "every other saturday") }
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include(Recurrence::RruleValidator::MESSAGE)
    end
  end

  describe "POST /admin/events" do
    it "creates a draft with the app account as the default host" do
      app_account = create(:app_account)
      venue = create(:venue)

      expect do
        post "/admin/events", params: { event: {
          title: "New meet", host: Admin::HostPicker.value("User", app_account.id), venue_id: venue.id,
          cadence: "once", timezone: "America/Los_Angeles", duration_minutes: 120, status: "draft",
          visibility: "public", rsvp_mode: "open", tags: [ "all", "" ],
          dtstart_local: "2026-11-07T07:30"
        } }
      end.to change(Event, :count).by(1)

      event = Event.order(:created_at).last
      expect(event.host_id).to eq(app_account.id)
      expect(event.host_name).to eq("Curb Social Club")
      expect(event.tags).to eq([ "all" ])
      expect(event.dtstart).to eq(zone.parse("2026-11-07 07:30"))
      expect(AdminAudit.where(target_id: event.id, action: "create")).to exist
    end

    it "reads the local start in the venue's zone when the timezone field is left at the default" do
      app_account = create(:app_account)
      venue = create(:venue, timezone: "America/New_York")

      post "/admin/events", params: { event: {
        title: "East coast meet", host: Admin::HostPicker.value("User", app_account.id), venue_id: venue.id,
        cadence: "once", timezone: "America/Los_Angeles", duration_minutes: 120, status: "draft",
        visibility: "public", rsvp_mode: "open", tags: [ "all", "" ], dtstart_local: "2026-11-07T07:30"
      } }

      event = Event.order(:created_at).last
      # The model copies the venue's zone at create, so the time entered has
      # to be read in that zone, not in the one the form happened to show.
      expect(event.timezone).to eq("America/New_York")
      expect(event.dtstart).to eq(ActiveSupport::TimeZone["America/New_York"].parse("2026-11-07 07:30"))
    end

    it "offers the app account first in the host picker (R-15)" do
      create(:app_account)
      create(:user).profile.update!(display_name: "Aaron Someone", is_host: true)

      get "/admin/events/new"
      handles = Nokogiri::HTML(response.body).css("select[name='event[host]'] optgroup[label=Users] option").map(&:text)
      expect(handles.first).to eq("Curb Social Club (@curb)")
    end
  end

  describe "the one-click buttons (R-16)" do
    it "AC-8: Verify now sets both stamps, clears dormant_at, and audits" do
      event = create(:event, :published, dormant_at: 5.days.ago, last_confirmed_at: 100.days.ago)

      get "/admin/events/#{event.id}/edit"
      expect(response.body).to have_button("Verify now")
      expect(response.body).to include("Mark this meet verified and confirmed as of now?")

      freeze_time do
        post "/admin/events/#{event.id}/verify"
        event.reload
        expect(event.verified_at).to eq(Time.current)
        expect(event.last_confirmed_at).to eq(Time.current)
      end
      expect(event.dormant_at).to be_nil
      expect(AdminAudit.where(target_id: event.id, action: "verify")).to exist
    end

    it "Confirm now moves only last_confirmed_at" do
      event = create(:event, :published, verified_at: nil, last_confirmed_at: 100.days.ago)
      post "/admin/events/#{event.id}/confirm"
      expect(event.reload.last_confirmed_at).to be_within(5.seconds).of(Time.current)
      expect(event.verified_at).to be_nil
      expect(AdminAudit.where(target_id: event.id, action: "confirm")).to exist
    end

    it "Re-materialize enqueues the job for that event and audits it" do
      event = create(:event, :published, :weekly)
      expect { post "/admin/events/#{event.id}/rematerialize" }
        .to have_enqueued_job(MaterializeOccurrencesJob).with(event.id)
      expect(response).to redirect_to("/admin/events/#{event.id}/occurrences")
      expect(AdminAudit.where(target_id: event.id, action: "rematerialize")).to exist
    end
  end

  describe "sponsorships (sponsors R-20)" do
    it "attaches, reorders, and detaches sponsors from the event form" do
      event = create(:event, :published)
      coffee = create(:sponsor, name: "Bear Coast")
      shop = create(:sponsor, name: "Apex Detail")

      patch "/admin/events/#{event.id}", params: { event: form_params(event, sponsorships_attributes: {
        "0" => { sponsor_id: coffee.id, role: "coffee", note: "Cart at the north end", position: "0" },
        "1" => { sponsor_id: shop.id, role: "partner", note: "", position: "1" },
        "2" => { sponsor_id: "", role: "vendor", note: "", position: "2" }
      }) }

      expect(event.reload.sponsorships.ordered.map { |row| [ row.sponsor.name, row.role ] })
        .to eq([ [ "Bear Coast", "coffee" ], [ "Apex Detail", "partner" ] ])

      first = event.sponsorships.ordered.first
      patch "/admin/events/#{event.id}", params: { event: form_params(event, sponsorships_attributes: {
        "0" => { id: first.id, sponsor_id: first.sponsor_id, role: first.role, position: "0", _destroy: "1" }
      }) }
      expect(event.reload.sponsorships.map(&:sponsor_id)).to eq([ shop.id ])
    end

    it "refuses a seventh sponsorship with a form error rather than saving six plus one" do
      event = create(:event, :published)
      rows = Array.new(7) { |i| [ i.to_s, { sponsor_id: create(:sponsor).id, role: "partner", position: i.to_s } ] }.to_h

      patch "/admin/events/#{event.id}", params: { event: form_params(event, sponsorships_attributes: rows) }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("limited to #{Event::MAX_SPONSORSHIPS} per event")
      expect(event.reload.sponsorships).to be_empty
    end
  end
end
