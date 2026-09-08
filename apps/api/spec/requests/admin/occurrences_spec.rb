require "rails_helper"

# docs/specs/admin.md R-17, R-27, AC-9, AC-22; events spec R-13.
RSpec.describe "admin event occurrences", type: :request do
  let(:admin) { create(:user, role: "admin") }
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  before { sign_in_admin(admin) }

  # The admin cookie expires after 12 hours, so a block that travels months
  # ahead signs in again on the far side of the jump.
  def travel_signed_in(time)
    travel_to(time) do
      sign_in_admin(admin)
      yield
    end
  end

  describe "GET /admin/events/:id/occurrences" do
    it "AC-22: renders the time in the event timezone with the zone abbreviation" do
      venue = create(:venue, name: "Victoria Gardens", city: "Rancho Cucamonga")
      event = create(:event, :published, venue: venue, timezone: "America/Los_Angeles")
      create(:event_occurrence, event: event, starts_at: Time.utc(2026, 11, 7, 15, 30))

      travel_signed_in(zone.parse("2026-11-01 09:00")) do
        get "/admin/events/#{event.id}/occurrences"
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Sat Nov 7, 7:30 am PST")
      end
    end

    it "lists 30 days back to 90 ahead and nothing outside the window" do
      event = create(:event, :published)
      create(:event_occurrence, event: event, starts_at: 10.days.ago, status: "completed")
      create(:event_occurrence, event: event, starts_at: 60.days.ago, status: "completed")
      create(:event_occurrence, event: event, starts_at: 20.days.from_now)
      create(:event_occurrence, event: event, starts_at: 120.days.from_now)

      get "/admin/events/#{event.id}/occurrences"
      rendered = Nokogiri::HTML(response.body).css("table.list tbody tr").size
      expect(rendered).to eq(2)
    end

    it "shows the announced empty copy when there are no dates" do
      event = create(:event, :published, cadence: "announced", dtstart: nil, rrule: nil)
      get "/admin/events/#{event.id}/occurrences"
      expect(response.body).to include("No dates yet. Add one when the host posts it.")
    end
  end

  describe "AC-9: an announced event" do
    let(:event) { create(:event, :published, cadence: "announced", dtstart: nil, rrule: nil) }

    it "takes an added date that survives Re-materialize, and refuses a cancel with no note" do
      get "/admin/events/#{event.id}/occurrences"
      expect(response.body).to have_button("Add date")

      travel_signed_in(zone.parse("2026-11-02 09:00")) do
        expect do
          post "/admin/events/#{event.id}/occurrences",
               params: { event_occurrence: { starts_at_local: "2026-11-07T07:30", status: "scheduled" } }
        end.to change { event.occurrences.count }.by(1)

        occurrence = event.occurrences.sole
        expect(occurrence.starts_at).to eq(zone.parse("2026-11-07 07:30"))
        expect(occurrence.overridden_at).to be_present

        # The materializer produces nothing for an announced event, and the
        # overridden row is never removed (events R-13).
        MaterializeOccurrencesJob.perform_now(event.id)
        expect(event.occurrences.reload.map(&:id)).to eq([ occurrence.id ])
        expect(occurrence.reload.status).to eq("scheduled")

        post "/admin/events/#{event.id}/occurrences/#{occurrence.id}/cancel", params: { override_note: "  " }
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include(Admin::Events::OccurrencesController::CANCEL_NOTE_ERROR)
        expect(occurrence.reload.status).to eq("scheduled")
        # The add form below the table is its own record, so a rejected
        # cancel does not pre-fill it with the failing date's note.
        add_note = Nokogiri::HTML(response.body).at("form.record-form input[name='event_occurrence[override_note]']")
        expect(add_note["value"]).to be_blank

        # A note past the model's limit lands in the same inline error, not
        # on an exception page.
        post "/admin/events/#{event.id}/occurrences/#{occurrence.id}/cancel",
             params: { override_note: "x" * (EventOccurrence::OVERRIDE_NOTE_MAX + 1) }
        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).to include("is too long")
        expect(occurrence.reload.status).to eq("scheduled")

        post "/admin/events/#{event.id}/occurrences/#{occurrence.id}/cancel",
             params: { override_note: "The lot is being resurfaced." }
        expect(response).to redirect_to("/admin/events/#{event.id}/occurrences")
        occurrence.reload
        expect(occurrence.status).to eq("cancelled")
        expect(occurrence.override_note).to eq("The lot is being resurfaced.")
        expect(AdminAudit.where(target_id: event.id, action: "occurrence_cancel")).to exist
        # Every occurrence audit names the row it touched.
        actions = AdminAudit.where(target_id: event.id).where("action LIKE ?", "occurrence_%")
        expect(actions.map { |row| row.changeset["occurrence_id"] }.uniq).to eq([ occurrence.id ])
      end
    end
  end

  describe "editing a date" do
    it "stamps overridden_at so the materializer leaves it alone" do
      event = create(:event, :published, :weekly)
      occurrence = create(:event_occurrence, event: event, starts_at: zone.parse("2026-11-07 07:30"))

      get "/admin/events/#{event.id}/occurrences/#{occurrence.id}/edit"
      expect(response.body).to have_field("event_occurrence[starts_at_local]", with: "2026-11-07T07:30")

      patch "/admin/events/#{event.id}/occurrences/#{occurrence.id}",
            params: { event_occurrence: { starts_at_local: "2026-11-07T09:00", status: "scheduled",
                                          override_note: "Later start this week." } }

      occurrence.reload
      expect(occurrence.starts_at).to eq(zone.parse("2026-11-07 09:00"))
      expect(occurrence.overridden_at).to be_present
      audit = AdminAudit.where(target_id: event.id, action: "occurrence_update").recent.first
      expect(audit.changeset["override_note"]).to include("after" => "Later start this week.")
    end

    it "re-renders with the model error when the times cross" do
      event = create(:event, :published)
      occurrence = create(:event_occurrence, event: event, starts_at: zone.parse("2026-11-07 07:30"))

      patch "/admin/events/#{event.id}/occurrences/#{occurrence.id}",
            params: { event_occurrence: { starts_at_local: "2026-11-07T09:00",
                                          ends_at_local: "2026-11-07T08:00", status: "scheduled" } }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("must be after starts_at")
      expect(occurrence.reload.starts_at).to eq(zone.parse("2026-11-07 07:30"))
    end
  end

  describe "resetting an override" do
    it "clears the override and re-materializes so the rule decides again" do
      event = create(:event, :published, :weekly)
      occurrence = create(:event_occurrence, event: event, starts_at: 3.days.from_now,
                                             overridden_at: Time.current, override_note: "Moved")

      get "/admin/events/#{event.id}/occurrences"
      expect(response.body).to have_button("Reset override")

      expect do
        post "/admin/events/#{event.id}/occurrences/#{occurrence.id}/reset"
      end.to have_enqueued_job(MaterializeOccurrencesJob).with(event.id)

      occurrence.reload
      expect(occurrence.overridden_at).to be_nil
      expect(occurrence.override_note).to be_nil
      expect(AdminAudit.where(target_id: event.id, action: "occurrence_reset")).to exist
    end
  end
end
