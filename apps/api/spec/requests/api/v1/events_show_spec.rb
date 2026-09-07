require "swagger_helper"

RSpec.describe "v1/events/{slug}" do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  event_schema = { type: :object, properties: { data: { "$ref" => "#/components/schemas/Event" } }, required: %w[data] }

  path "/v1/events/{slug}" do
    get "Event detail" do
      description "The Event shape. Anonymous by default. A draft is 404 unless the viewer can edit; an unlisted event needs its share token; a cancelled or hidden event is 410 gone with up to three nearby meets when near is sent; a dormant event is 200 with dormant true. A recurring event whose materialized horizon is under 60 days re-materializes on read (R-14)."
      tags "Events"
      produces "application/json"
      parameter name: :slug, in: :path, schema: { type: :string }
      parameter name: :token, in: :query, required: false, schema: { type: :string }, description: "Share token for an unlisted event"
      parameter name: :near, in: :query, required: false, schema: { type: :string }, description: "lat,lng; fills nearby on a 410"

      response "200", "AC-1: published recurring event with sponsorships and six dates" do
        schema event_schema
        let!(:event) do
          meet = create_meet(:corona_del_mar, title: "Back Bay Coffee", cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA",
                                              parking_note: "Park in the back lot, not along the curb.")
          first = meet.occurrences.first.starts_at
          5.times { |i| create(:event_occurrence, event: meet, starts_at: first + ((i + 1) * 7).days) }
          create(:event_sponsorship, event: meet, sponsor: create(:sponsor, name: "Second"), role: "vendor", position: 1)
          create(:event_sponsorship, event: meet, sponsor: create(:sponsor, name: "First"), role: "presented_by", position: 0)
          meet
        end
        let(:slug) { event.slug }

        run_test! do
          data = json["data"]
          expect(data).to include("slug" => event.slug, "claimed" => false, "dormant" => false, "hidden" => false,
                                  "status" => "published", "visibility" => "public", "rrule" => "FREQ=WEEKLY;BYDAY=SA",
                                  "rrule_text" => "Every Saturday", "duration_minutes" => 120, "rsvp_mode" => "open")
          expect(data["parking_note"]).to eq("Park in the back lot, not along the curb.")
          expect(data["upcoming_occurrences"].size).to eq(4)
          expect(data["upcoming_occurrences"].map { |o| o["starts_at"] }).to eq(data["upcoming_occurrences"].map { |o| o["starts_at"] }.sort)
          expect(data["sponsorships"].map { |s| s["sponsor"]["name"] }).to eq(%w[First Second])
          expect(data["sponsorships"].first).to include("role" => "presented_by", "position" => 0)
          expect(data["viewer"]).to eq({ "following" => false, "rsvp" => nil, "can_edit" => false, "can_claim" => false,
                                         "claim_status" => nil, "reported" => false })
          expect(data["venue"]).to include("region" => "CA", "country" => "US", "timezone" => "America/Los_Angeles")
          expect(data["venue"]["location"]).to include("lat" => 33.599)
        end
      end

      response "404", "AC-22: a draft is not readable by the public" do
        schema "$ref" => "#/components/schemas/Error"
        let(:slug) { create(:event, title: "Draft meet").slug }

        run_test! do
          expect(json["error"]).to include("code" => "not_found")
        end
      end

      response "410", "AC-3: a cancelled event is gone, with nearby meets when near is sent" do
        schema "$ref" => "#/components/schemas/Error"
        let(:near) { "33.6172,-117.9270" }
        let!(:cancelled) do
          meet = create_meet(:corona_del_mar, title: "Cancelled meet")
          meet.update!(status: "cancelled")
          create_meet(:corona_del_mar, title: "Still on")
          create_meet(:huntington_beach_pier, title: "Also on")
          create_meet(:san_clemente_pier, title: "Too far")
          meet
        end
        let(:slug) { cancelled.slug }

        run_test! do
          expect(json.dig("error", "code")).to eq("gone")
          expect(json.dig("error", "message")).to eq("This meet is no longer listed.")
          nearby = json.dig("error", "details", "nearby")
          expect(nearby.map { |row| row["title"] }).to contain_exactly("Still on", "Also on")
          expect(nearby.first["distance_m"]).to be_a(Integer)
        end
      end
    end
  end

  describe "GET /v1/events/:slug" do
    it "AC-2: an unlisted event is 404 without its token and 200 with it (R-5)" do
      event = create_meet(:corona_del_mar, title: "Unlisted meet", visibility: "unlisted")

      get "/v1/events/#{event.slug}"
      expect(response).to have_http_status(:not_found)

      get "/v1/events/#{event.slug}", params: { token: Events::UnlistedToken.generate(event.id) }
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "visibility")).to eq("unlisted")

      get "/v1/events/#{event.slug}", params: { token: Events::UnlistedToken.generate(create_meet(:lido).id) }
      expect(response).to have_http_status(:not_found)
      get "/v1/events/#{event.slug}", params: { token: "not-a-token" }
      expect(response).to have_http_status(:not_found)

      get "/v1/events", params: { near: "33.6172,-117.9270" }
      expect(data_titles).not_to include("Unlisted meet")
      get "/v1/events/map", params: { bbox: "-118.05,33.40,-117.60,33.70" }
      expect(json["data"].map { |pin| pin["title"] }).not_to include("Unlisted meet")
    end

    it "AC-22: a draft and an unlisted event are readable by their host, and a hidden one is 410 for the public" do
      user = create(:user)
      draft = create(:event, host: user, created_by: user, title: "Draft meet")
      hidden = create_meet(:corona_del_mar, title: "Hidden meet", host: user)
      hidden.update_columns(hidden_at: Time.current)
      headers = { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(user).token}" }

      get "/v1/events/#{draft.slug}"
      expect(response).to have_http_status(:not_found)
      get "/v1/events/#{draft.slug}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "viewer", "can_edit")).to be(true)
      expect(json.dig("data", "status")).to eq("draft")

      get "/v1/events/#{hidden.slug}"
      expect(response).to have_http_status(:gone)
      expect(json.dig("error", "details", "nearby")).to eq([])
      get "/v1/events/#{hidden.slug}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "hidden")).to be(true)
      expect(response.headers["Cache-Control"]).to include("no-store")
    end

    it "AC-17 and R-27: a dormant event still serves its page with dormant true" do
      event = create_meet(:corona_del_mar, title: "Dormant meet", dormant_at: Time.current, last_confirmed_at: 91.days.ago)

      get "/v1/events/#{event.slug}"
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "dormant")).to be(true)
      expect(json.dig("data", "stale")).to be(true)
      expect(json.dig("data", "upcoming_occurrences").size).to eq(1)
    end

    it "enqueues the read-time materializer at most once an hour per event (R-14)" do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      event = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
      event.occurrences.update_all(starts_at: 45.days.from_now, ends_at: 45.days.from_now + 2.hours)

      expect { 3.times { get "/v1/events/#{event.slug}" } }.to have_enqueued_job(MaterializeOccurrencesJob).once

      travel_to 61.minutes.from_now do
        expect { get "/v1/events/#{event.slug}" }.to have_enqueued_job(MaterializeOccurrencesJob).once
      end
    end

    it "AC-19: a recurring event re-materializes on read when its horizon is under 60 days (R-14)" do
      event = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
      event.occurrences.update_all(starts_at: 45.days.from_now, ends_at: 45.days.from_now + 2.hours)

      expect { get "/v1/events/#{event.slug}" }.to have_enqueued_job(MaterializeOccurrencesJob).with(event.id)

      event.occurrences.update_all(starts_at: 75.days.from_now, ends_at: 75.days.from_now + 2.hours)
      expect { get "/v1/events/#{event.slug}" }.not_to have_enqueued_job(MaterializeOccurrencesJob)

      once = create_meet(:lido)
      once.occurrences.update_all(starts_at: 2.days.from_now, ends_at: 2.days.from_now + 2.hours)
      expect { get "/v1/events/#{once.slug}" }.not_to have_enqueued_job(MaterializeOccurrencesJob)
    end

    it "keeps an unlisted event indistinguishable from an unknown slug, even when it is cancelled (R-5)" do
      event = create_meet(:corona_del_mar, title: "Unlisted and cancelled", visibility: "unlisted")
      event.update!(status: "cancelled")

      get "/v1/events/#{event.slug}"
      expect(response).to have_http_status(:not_found)

      get "/v1/events/#{event.slug}", params: { token: Events::UnlistedToken.generate(event.id) }
      expect(response).to have_http_status(:gone)
    end

    it "keeps a gone event's 410 when the client sends a malformed near" do
      event = create_meet(:corona_del_mar)
      event.update!(status: "cancelled")

      get "/v1/events/#{event.slug}", params: { near: "not,coordinates" }
      expect(response).to have_http_status(:gone)
      expect(json.dig("error", "details", "nearby")).to eq([])
    end

    it "is anonymous, publicly cacheable, and 404s an unknown slug" do
      event = create_meet(:corona_del_mar)
      get "/v1/events/#{event.slug}", headers: { "Authorization" => "Bearer garbage" }
      expect(response).to have_http_status(:ok)
      expect(response.headers["Cache-Control"]).to include("public", "max-age=30")

      get "/v1/events/no-such-meet"
      expect(response).to have_http_status(:not_found)
      expect(response.headers["Cache-Control"]).to include("no-store")
    end

    it "shows a signed-in viewer their claim options without a public cache" do
      event = create_meet(:corona_del_mar)
      user = create(:user)
      headers = { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(user).token}" }

      get "/v1/events/#{event.slug}", headers: headers
      expect(json.dig("data", "viewer")).to include("can_claim" => true, "claim_status" => nil, "can_edit" => false)
      expect(response.headers["Cache-Control"]).to include("no-store")

      create(:claim_request, user: user, event: event, claim_as_id: user.id)
      get "/v1/events/#{event.slug}", headers: headers
      expect(json.dig("data", "viewer", "claim_status")).to eq("pending")
    end
  end
end
