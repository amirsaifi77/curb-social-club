require "swagger_helper"

RSpec.describe "v1/events/{id}/confirm" do
  let(:user) { create(:user) }

  path "/v1/events/{id}/confirm" do
    post "Confirm the schedule is current" do
      description "The host (the user host, an owner or admin of the hosting club, or a platform admin) answers \"Still happening?\": last_confirmed_at moves to now, dormant_at clears, and a dormant event is re-materialized (R-24, R-28). Anyone else gets 403."
      tags "Events"
      produces "application/json"
      security [ { bearer: [] } ]
      parameter name: :id, in: :path, schema: { type: :string, format: :uuid }

      response "200", "AC-18: an admin confirms a dormant event" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Event" } }, required: %w[data]
        let(:admin) { create(:user, role: "admin") }
        let(:Authorization) { "Bearer #{Auth::SessionIssuer.issue(admin).token}" }
        let!(:event) do
          create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA",
                                       dormant_at: 1.day.ago, last_confirmed_at: 91.days.ago)
        end
        let(:id) { event.id }

        run_test! do
          expect(json.dig("data", "dormant")).to be(false)
          expect(json.dig("data", "stale")).to be(false)
          expect(event.reload.dormant_at).to be_nil
          expect(event.last_confirmed_at).to be_within(5.seconds).of(Time.current)
          expect(MaterializeOccurrencesJob).to have_been_enqueued.with(event.id)
        end
      end

      response "403", "AC-18: a member with no role may not confirm" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { "Bearer #{Auth::SessionIssuer.issue(user).token}" }
        let(:id) { create_meet(:corona_del_mar).id }

        run_test! do
          expect(json.dig("error", "code")).to eq("forbidden")
        end
      end

      response "401", "anonymous" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { nil }
        let(:id) { create_meet(:corona_del_mar).id }

        run_test! do
          expect(json.dig("error", "code")).to eq("unauthenticated")
        end
      end
    end
  end

  describe "POST /v1/events/:id/confirm" do
    def confirm(event, as:)
      post "/v1/events/#{event.id}/confirm", headers: { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(as).token}" }
    end

    it "lets the user host and a club owner or admin confirm, and nobody else (R-24)" do
      host = create(:user)
      own = create_meet(:corona_del_mar, host: host)
      confirm(own, as: host)
      expect(response).to have_http_status(:ok)
      expect(own.reload.last_confirmed_at).to be_present

      owner = create(:user)
      club = create(:club, owner: owner)
      club_event = create_meet(:lido, host: club)
      confirm(club_event, as: owner)
      expect(response).to have_http_status(:ok)

      club_admin = create(:club_membership, :admin, club: club).user
      confirm(club_event, as: club_admin)
      expect(response).to have_http_status(:ok)

      plain = create(:club_membership, club: club).user
      confirm(club_event, as: plain)
      expect(response).to have_http_status(:forbidden)

      confirm(create_meet(:lido, host: create(:sponsor)), as: host)
      expect(response).to have_http_status(:forbidden)
    end

    it "does not enqueue the materializer for an event that was not dormant, and 404s an unknown event" do
      event = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA", host: user)
      expect { confirm(event, as: user) }.not_to have_enqueued_job(MaterializeOccurrencesJob)
      expect(response).to have_http_status(:ok)

      post "/v1/events/#{SecureRandom.uuid}/confirm",
           headers: { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(user).token}" }
      expect(response).to have_http_status(:not_found)
    end

    it "refuses a suspended account" do
      host = create(:user)
      event = create_meet(:corona_del_mar, host: host)
      host.update!(status: "suspended")
      confirm(event, as: host)
      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "details", "reason")).to eq("suspended")
    end
  end
end
