require "swagger_helper"

RSpec.describe "v1/occurrences" do
  occurrence_schema = { type: :object, properties: { data: { "$ref" => "#/components/schemas/Occurrence" } }, required: %w[data] }

  path "/v1/events/{id}/occurrences" do
    get "Upcoming occurrences of an event" do
      description "Upcoming scheduled and cancelled dates, oldest first, cursor paginated (R-22)."
      tags "Events"
      produces "application/json"
      parameter name: :id, in: :path, schema: { type: :string, format: :uuid }
      parameter name: :limit, in: :query, required: false, schema: { type: :integer, minimum: 1, maximum: 50 }
      parameter name: :cursor, in: :query, required: false, schema: { type: :string }

      response "400", "a crafted or malformed cursor" do
        schema "$ref" => "#/components/schemas/Error"
        let(:id) { create_meet(:corona_del_mar).id }
        let(:cursor) { Geo::Cursor.encode("occurrence", [ "not-a-time", SecureRandom.uuid ]) }

        run_test! do
          expect(json["error"]).to include("code" => "bad_request", "message" => "cursor is invalid.")
        end
      end

      response "404", "an event the viewer cannot see" do
        schema "$ref" => "#/components/schemas/Error"
        let(:id) { create(:event).id }
        run_test!
      end

      response "200", "AC-23: three scheduled and one cancelled upcoming date" do
        schema type: :object,
               properties: {
                 data: { type: :array, items: { "$ref" => "#/components/schemas/Occurrence" } },
                 meta: { type: :object, properties: { next_cursor: { type: :string, nullable: true }, total: { type: :integer, nullable: true } }, required: %w[next_cursor total] }
               },
               required: %w[data meta]
        let!(:event) do
          meet = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
          first = meet.occurrences.first.starts_at
          create(:event_occurrence, event: meet, starts_at: first + 7.days)
          create(:event_occurrence, event: meet, starts_at: first + 14.days)
          create(:event_occurrence, :cancelled, event: meet, starts_at: first + 21.days)
          create(:event_occurrence, :past, event: meet)
          meet
        end
        let(:id) { event.id }

        run_test! do
          rows = json["data"]
          expect(rows.size).to eq(4)
          expect(rows.map { |row| row["status"] }).to eq(%w[scheduled scheduled scheduled cancelled])
          expect(rows.last["override_note"]).to eq("Rained out this week")
          expect(rows.first).to include("timezone" => "America/Los_Angeles", "going_count" => 0, "check_in_count" => 0)
          expect(rows.first["event"]).to include("slug" => event.slug)
          expect(rows.first["viewer"]).to eq({ "rsvp" => nil, "checked_in" => false })
          expect(json.dig("meta", "next_cursor")).to be_nil
        end
      end
    end
  end

  path "/v1/occurrences/{id}" do
    get "One occurrence" do
      description "The Occurrence shape with its event summary, timezone, and override note."
      tags "Occurrences"
      produces "application/json"
      parameter name: :id, in: :path, schema: { type: :string, format: :uuid }

      response "200", "AC-23: a cancelled occurrence carries its timezone and note" do
        schema occurrence_schema
        let!(:occurrence) do
          meet = create_meet(:corona_del_mar)
          create(:event_occurrence, :cancelled, event: meet, starts_at: meet.dtstart + 7.days)
        end
        let(:id) { occurrence.id }

        run_test! do
          expect(json["data"]).to include("timezone" => "America/Los_Angeles", "status" => "cancelled",
                                          "override_note" => "Rained out this week")
          expect(json.dig("data", "event", "next_occurrence")).to be_present

          # web.md AC-4: W04 is self-canonical only for a date a host edited,
          # so a client has to be able to tell an edited date from one the
          # materializer wrote. This lives here rather than in a second 200
          # block, because rswag merges responses by status and the last one
          # would erase this one's description from the published spec.
          edited = create(:event_occurrence, :overridden, event: occurrence.event,
                                                          starts_at: occurrence.starts_at + 7.days)
          get "/v1/occurrences/#{edited.id}"
          expect(JSON.parse(response.body).dig("data", "overridden_at")).to be_present

          plain = create(:event_occurrence, event: occurrence.event, starts_at: occurrence.starts_at + 14.days)
          get "/v1/occurrences/#{plain.id}"
          expect(JSON.parse(response.body).dig("data", "overridden_at")).to be_nil
        end
      end

      response "404", "unknown occurrence" do
        schema "$ref" => "#/components/schemas/Error"
        let(:id) { SecureRandom.uuid }
        run_test!
      end
    end
  end

  describe "occurrence reads" do
    it "pages with an opaque cursor and rejects a bad one" do
      event = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
      first = event.occurrences.first.starts_at
      2.times { |i| create(:event_occurrence, event: event, starts_at: first + ((i + 1) * 7).days) }

      get "/v1/events/#{event.id}/occurrences", params: { limit: 2 }
      expect(json["data"].size).to eq(2)
      cursor = json.dig("meta", "next_cursor")
      expect(cursor).to be_present

      get "/v1/events/#{event.id}/occurrences", params: { limit: 2, cursor: cursor }
      expect(json["data"].size).to eq(1)
      expect(json.dig("meta", "next_cursor")).to be_nil

      get "/v1/events/#{event.id}/occurrences", params: { cursor: "nope" }
      expect(response).to have_http_status(:bad_request)
      # Both halves of the tuple are parsed in Ruby, never cast by Postgres.
      [ [ "not-a-time", SecureRandom.uuid ], [ 42, SecureRandom.uuid ], [ nil, SecureRandom.uuid ],
        [ Time.current.utc.iso8601(6), "not-a-uuid" ] ].each do |values|
        get "/v1/events/#{event.id}/occurrences", params: { cursor: Geo::Cursor.encode("occurrence", values) }
        expect(response).to have_http_status(:bad_request), "expected #{values.inspect} to be rejected"
        expect(json.dig("error", "message")).to eq("cursor is invalid.")
      end
      get "/v1/events/#{event.id}/occurrences", params: { limit: "many" }
      expect(response).to have_http_status(:bad_request)
    end

    it "serializes the event summary once for a page and keeps the response private for a host-only event" do
      event = create_meet(:corona_del_mar, cadence: "weekly", rrule: "FREQ=WEEKLY;BYDAY=SA")
      first = event.occurrences.first.starts_at
      9.times { |i| create(:event_occurrence, event: event, starts_at: first + ((i + 1) * 7).days) }

      queries = 0
      counter = ->(_name, _start, _finish, _id, payload) { queries += 1 unless payload[:name] == "SCHEMA" }
      ActiveSupport::Notifications.subscribed(counter, "sql.active_record") do
        get "/v1/events/#{event.id}/occurrences", params: { limit: 10 }
      end
      expect(json["data"].size).to eq(10)
      expect(queries).to be < 15

      draft = create(:event)
      create(:event_occurrence, event: draft)
      headers = { "Authorization" => "Bearer #{Auth::SessionIssuer.issue(draft.host).token}" }
      get "/v1/events/#{draft.id}/occurrences", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.headers["Cache-Control"]).to include("no-store")

      get "/v1/events/#{event.id}/occurrences"
      expect(response.headers["Cache-Control"]).to include("public", "max-age=30")
    end

    it "hides the dates of an event the viewer cannot see" do
      draft = create(:event)
      create(:event_occurrence, event: draft)
      unlisted = create_meet(:corona_del_mar, visibility: "unlisted")
      cancelled = create_meet(:lido)
      cancelled.update!(status: "cancelled")

      get "/v1/events/#{draft.id}/occurrences"
      expect(response).to have_http_status(:not_found)
      get "/v1/occurrences/#{draft.occurrences.first.id}"
      expect(response).to have_http_status(:not_found)

      # Unlisted events keep their page behind a token; their dates stay
      # readable by id, which is what the share link opens.
      get "/v1/events/#{unlisted.id}/occurrences"
      expect(response).to have_http_status(:ok)

      get "/v1/occurrences/#{cancelled.occurrences.first.id}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
