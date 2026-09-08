require "swagger_helper"

RSpec.describe "v1/auth" do
  let(:device_id) { SecureRandom.uuid }

  path "/v1/auth/apple" do
    post "Sign in with Apple" do
      description "Verifies the identity token against Apple's JWKS and returns an opaque session token. " \
                  "full_name only arrives from Apple on first authorization. 201 when the account is new, 200 otherwise."
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: "X-Device-Id", in: :header, schema: { type: :string, format: :uuid }, required: false
      parameter name: :body, in: :body, required: true, schema: {
        type: :object,
        properties: {
          identity_token: { type: :string },
          authorization_code: { type: :string },
          nonce: { type: :string, description: "Raw nonce; its SHA256 must equal the token's nonce claim" },
          full_name: { type: :object, nullable: true, properties: { givenName: { type: :string, nullable: true }, familyName: { type: :string, nullable: true } } }
        },
        required: %w[identity_token authorization_code nonce]
      }

      response "201", "new account created" do
        schema type: :object, properties: {
          data: { type: :object, properties: {
            token: { type: :string }, user: { "$ref" => "#/components/schemas/User" }, is_new: { type: :boolean }
          }, required: %w[token user is_new] }
        }, required: %w[data]
        let(:nonce) { apple_nonce }
        let(:"X-Device-Id") { device_id }
        let(:body) { apple_params(nonce: nonce).merge(full_name: { givenName: "Ada", familyName: "Lovelace" }) }

        run_test! do
          expect(json.dig("data", "is_new")).to be(true)
          expect(json.dig("data", "user", "profile", "display_name")).to eq("Ada Lovelace")
          expect(Device.find_by(anonymous_id: device_id).user_id).to eq(json.dig("data", "user", "id"))
        end
      end

      response "200", "existing account signed in" do
        schema type: :object, properties: {
          data: { type: :object, properties: {
            token: { type: :string }, user: { "$ref" => "#/components/schemas/User" }, is_new: { type: :boolean }
          }, required: %w[token user is_new] }
        }, required: %w[data]
        let(:user) { create(:user) }
        let!(:identity) { create(:identity, :apple, user: user, provider_uid: "apple-known") }
        let(:body) { apple_params(nonce: apple_nonce, sub: "apple-known") }
        run_test! do
          expect(json.dig("data", "is_new")).to be(false)
          expect(json.dig("data", "user", "id")).to eq(user.id)
        end
      end

      response "401", "token could not be verified" do
        schema "$ref" => "#/components/schemas/Error"
        let(:body) { apple_params(nonce: apple_nonce, key: ProviderTokens::ROGUE_KEY) }
        run_test!
      end

      response "403", "account suspended" do
        schema "$ref" => "#/components/schemas/Error"
        let(:user) { create(:user, :suspended) }
        let!(:identity) { create(:identity, :apple, user: user, provider_uid: "apple-suspended") }
        let(:body) { apple_params(nonce: apple_nonce, sub: "apple-suspended") }
        run_test! do
          expect(json.dig("error", "details", "reason")).to eq("suspended")
        end
      end
    end
  end

  path "/v1/auth/google" do
    post "Sign in with Google" do
      description "Verifies the id token against Google's JWKS (iss accounts.google.com, aud the iOS client id, email_verified)."
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: "X-Device-Id", in: :header, schema: { type: :string, format: :uuid }, required: false
      parameter name: :body, in: :body, required: true, schema: {
        type: :object, properties: { id_token: { type: :string } }, required: %w[id_token]
      }

      response "201", "new account created" do
        schema type: :object, properties: {
          data: { type: :object, properties: {
            token: { type: :string }, user: { "$ref" => "#/components/schemas/User" }, is_new: { type: :boolean }
          }, required: %w[token user is_new] }
        }, required: %w[data]
        let(:body) { { id_token: google_token(name: "Grace Hopper") } }
        run_test! do
          expect(json.dig("data", "user", "profile", "display_name")).to eq("Grace Hopper")
          expect(json.dig("data", "user", "profile", "handle")).to eq("grace_hopper")
        end
      end

      response "200", "existing account signed in" do
        schema type: :object, properties: {
          data: { type: :object, properties: {
            token: { type: :string }, user: { "$ref" => "#/components/schemas/User" }, is_new: { type: :boolean }
          }, required: %w[token user is_new] }
        }, required: %w[data]
        let(:user) { create(:user) }
        let!(:identity) { create(:identity, user: user, provider_uid: "google-known") }
        let(:body) { { id_token: google_token(sub: "google-known", email: user.email) } }
        run_test! do
          expect(json.dig("data", "is_new")).to be(false)
          expect(json.dig("data", "user", "id")).to eq(user.id)
        end
      end

      response "401", "token could not be verified" do
        schema "$ref" => "#/components/schemas/Error"
        let(:body) { { id_token: google_token(email_verified: false) } }
        run_test!
      end
    end
  end

  path "/v1/auth/session" do
    delete "Sign out this session" do
      description "Deletes only the calling session row and unlinks its device."
      tags "Auth"
      security [ { bearer: [] } ]

      response "204", "signed out" do
        let(:user) { create(:user) }
        let(:issued) { Auth::SessionIssuer.issue(user) }
        let(:Authorization) { "Bearer #{issued.token}" }
        run_test!
      end

      response "401", "not signed in" do
        schema "$ref" => "#/components/schemas/Error"
        let(:Authorization) { "Bearer nope" }
        run_test!
      end
    end
  end

  describe "scenarios" do
    let(:headers) { { "X-Device-Id" => device_id } }

    it "creates users, identities, profiles, sessions and stores only the token digest (AC-1)" do
      nonce = apple_nonce
      params = apple_params(nonce: nonce, sub: "apple-ac1").merge(full_name: { givenName: "Ada", familyName: "Lovelace" })

      expect { post "/v1/auth/apple", params: params, headers: headers, as: :json }
        .to change(User, :count).by(1)
        .and change(Identity, :count).by(1)
        .and change(Profile, :count).by(1)
        .and change(Session, :count).by(1)

      expect(response).to have_http_status(:created)
      token = json.dig("data", "token")
      identity = Identity.find_by!(provider: "apple", provider_uid: "apple-ac1")
      session = identity.user.sessions.sole
      expect(session.token_digest).to eq(Digest::SHA256.hexdigest(token))
      expect(session.attributes.values.map(&:to_s)).not_to include(token)
      expect(identity.provider_refresh_token).to eq("apple-refresh-test")
      expect(Device.find_by(anonymous_id: device_id).user).to eq(identity.user)
    end

    it "keeps the display name and adds a session on a second sign-in (AC-2)" do
      post "/v1/auth/apple", params: apple_params(nonce: apple_nonce, sub: "apple-ac2").merge(full_name: { givenName: "Ada" }), headers: headers, as: :json
      first_id = json.dig("data", "user", "id")

      post "/v1/auth/apple", params: apple_params(nonce: apple_nonce, sub: "apple-ac2").merge(full_name: { givenName: "Other" }), headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "is_new")).to be(false)
      expect(json.dig("data", "user", "id")).to eq(first_id)
      expect(json.dig("data", "user", "profile", "display_name")).to eq("Ada")
      expect(User.find(first_id).sessions.count).to eq(2)
    end

    it "answers 401 with one identical message for every kind of bad token (AC-3)" do
      nonce = apple_nonce
      bodies = [
        apple_params(nonce: nonce, key: ProviderTokens::ROGUE_KEY),
        apple_params(nonce: nonce, aud: "wrong.bundle"),
        apple_params(nonce: nonce, exp: 1.minute.ago.to_i),
        apple_params(nonce: nonce).merge(nonce: "different-nonce")
      ]
      responses = bodies.map do |body|
        post "/v1/auth/apple", params: body, as: :json
        [ response.status, response.body ]
      end
      expect(responses.map(&:first)).to all(eq(401))
      expect(responses.map(&:last).uniq.size).to eq(1)
      expect(json.dig("error", "code")).to eq("unauthenticated")
    end

    it "links a verified non-relay email to the existing user and never a relay address (AC-4)" do
      existing = create(:user, email: "shared@example.com")
      create(:identity, user: existing, provider_uid: "google-shared")

      post "/v1/auth/apple", params: apple_params(nonce: apple_nonce, sub: "apple-shared", email: "shared@example.com"), as: :json
      expect(response).to have_http_status(:ok)
      expect(existing.identities.reload.map(&:provider)).to contain_exactly("google", "apple")

      post "/v1/auth/apple", params: apple_params(nonce: apple_nonce, sub: "apple-relay", email: "abc123@privaterelay.appleid.com"), as: :json
      expect(response).to have_http_status(:created)
      relay_user = Identity.find_by!(provider: "apple", provider_uid: "apple-relay").user
      expect(relay_user).not_to eq(existing)
      expect(relay_user.email).to be_nil
    end

    it "deletes only the calling session and unlinks the device (AC-6)" do
      user = create(:user)
      device = create(:device, user: user)
      mine = Auth::SessionIssuer.issue(user, device: device)
      other = Auth::SessionIssuer.issue(user)

      delete "/v1/auth/session", headers: bearer(mine.token)
      expect(response).to have_http_status(:no_content)

      get "/v1/me", headers: bearer(mine.token)
      expect(response).to have_http_status(:unauthorized)
      get "/v1/me", headers: bearer(other.token)
      expect(response).to have_http_status(:ok)
      expect(device.reload.attributes.slice("user_id", "push_token").values).to all(be_nil)
    end

    it "restores a soft-deleted account on sign-in (AC-10)" do
      user = create(:user, :deleted)
      create(:identity, user: user, provider_uid: "google-back")

      post "/v1/auth/google", params: { id_token: google_token(sub: "google-back", email: user.email) }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "is_new")).to be(false)
      expect(user.reload).to have_attributes(status: "active", deleted_at: nil)
      expect(AccountRestoreJob).to have_been_enqueued.with(user.id)
    end

    it "rejects a suspended user on sign-in and on an existing token (AC-11)" do
      user = create(:user, :suspended)
      create(:identity, user: user, provider_uid: "google-susp")
      issued = Auth::SessionIssuer.issue(user)

      post "/v1/auth/google", params: { id_token: google_token(sub: "google-susp", email: user.email) }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "details", "reason")).to eq("suspended")

      get "/v1/me", headers: bearer(issued.token)
      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "details", "reason")).to eq("suspended")
    end
  end
  describe "sign-up handles and names (R-1, R-3, R-4)" do
    it "signs up a person whose name is a reserved handle, and truncates a long display name" do
      post "/v1/auth/google", params: { id_token: google_token(email: "support@example.com", name: "Support") },
                              as: :json
      expect(response).to have_http_status(:created)
      handle = json.dig("data", "user", "profile", "handle")
      expect(handle).to start_with("support")
      expect(handle).not_to eq("support")

      long = "Bartholomew Archibald Fitzgerald the Third of Newport"
      post "/v1/auth/google", params: { id_token: google_token(email: "long@example.com", name: long) },
                              as: :json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "user", "profile", "display_name")).to eq(long.first(40))
    end
  end

end
