require "swagger_helper"

RSpec.describe "v1/me" do
  let(:user) { create(:user) }
  let(:issued) { Auth::SessionIssuer.issue(user) }
  let(:Authorization) { "Bearer #{issued.token}" }

  path "/v1/me" do
    get "Current user" do
      description "The signed-in user with profile, linked identities, and notification preferences."
      tags "Me"
      produces "application/json"
      security [ { bearer: [] } ]

      response "200", "current user" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/User" } }, required: %w[data]
        run_test! do
          expect(json.dig("data", "id")).to eq(user.id)
          expect(json.dig("data", "profile", "viewer", "is_self")).to be(true)
        end
      end

      response "401", "not signed in" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { nil }
        run_test!
      end
    end

    patch "Update account fields" do
      description "Phase 0 accepts profile.handle and profile.display_name only."
      tags "Me"
      consumes "application/json"
      produces "application/json"
      security [ { bearer: [] } ]
      parameter name: :body, in: :body, required: true, schema: {
        type: :object,
        properties: { profile: { type: :object, properties: { handle: { type: :string }, display_name: { type: :string } } } },
        required: %w[profile]
      }

      response "200", "updated" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/User" } }, required: %w[data]
        let(:body) { { profile: { handle: "new_handle", display_name: "New Name" } } }
        run_test! do
          expect(json.dig("data", "profile", "handle")).to eq("new_handle")
        end
      end

      response "422", "handle taken or invalid" do
        schema "$ref" => "#/components/schemas/Error"
        let(:body) { { profile: { handle: "Bad Handle!" } } }
        run_test! do
          expect(json.dig("error", "code")).to eq("validation_failed")
          expect(json.dig("error", "details", "handle")).to be_present
        end
      end
    end

    delete "Delete account" do
      description "Soft-deletes now (sessions revoked, devices unlinked) and purges after 30 days; signing in again before then restores the account."
      tags "Me"
      produces "application/json"
      security [ { bearer: [] } ]

      response "202", "deletion scheduled" do
        schema type: :object, properties: {
          data: { type: :object, properties: { purge_after: { type: :string, format: "date-time" } }, required: %w[purge_after] }
        }, required: %w[data]
        run_test! do
          expect(user.reload).to have_attributes(status: "deleted")
          expect(user.sessions.count).to eq(0)
          expect(AccountDeletionJob).to have_been_enqueued.with(user.id)
        end
      end
    end
  end

  describe "scenarios" do
    it "slides expiry only when under 30 days remain and rejects expired sessions (AC-5)" do
      soon = create(:session, user: user, expires_at: 20.days.from_now, last_used_at: 2.hours.ago)
      far = create(:session, user: user, expires_at: 60.days.from_now, last_used_at: 2.hours.ago)
      dead = create(:session, user: user, expires_at: 1.day.ago)
      digest_of = ->(s) { s.token_digest }
      allow(Auth::SessionIssuer).to receive(:digest) { |t| { "soon" => digest_of[soon], "far" => digest_of[far], "dead" => digest_of[dead] }.fetch(t, "x") }

      get "/v1/me", headers: bearer("soon")
      expect(response).to have_http_status(:ok)
      expect(soon.reload.expires_at).to be_within(1.minute).of(90.days.from_now)

      get "/v1/me", headers: bearer("far")
      expect(far.reload.expires_at).to be_within(1.minute).of(60.days.from_now)

      get "/v1/me", headers: bearer("dead")
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects a taken handle and an invalid handle, then accepts a valid one (AC-7)" do
      create(:user).profile.update!(handle: "taken_one")

      patch "/v1/me", params: { profile: { handle: "taken_one" } }, headers: bearer(issued.token), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig("error", "details", "handle")).to be_present

      patch "/v1/me", params: { profile: { handle: "Bad Handle!" } }, headers: bearer(issued.token), as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig("error", "details", "handle")).to be_present

      patch "/v1/me", params: { profile: { handle: "fine_handle" } }, headers: bearer(issued.token), as: :json
      expect(response).to have_http_status(:ok)
    end

    it "revokes the Apple token, clears sessions, and unlinks devices on deletion (AC-8, Phase 0 tables)" do
      create(:identity, :apple, user: user)
      device = create(:device, user: user)

      perform_enqueued_jobs do
        delete "/v1/me", headers: bearer(issued.token)
      end

      expect(response).to have_http_status(:accepted)
      expect(Time.iso8601(json.dig("data", "purge_after"))).to be_within(1.minute).of(30.days.from_now)
      expect(a_request(:post, Auth::AppleClient::REVOKE_URL.to_s)).to have_been_made.once
      expect(user.reload.sessions).to be_empty
      expect(device.reload.attributes.slice("user_id", "push_token").values).to all(be_nil)
      expect(user.identities.find_by(provider: "apple").provider_refresh_token).to be_nil
    end
  end
end
