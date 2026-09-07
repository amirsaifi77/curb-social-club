require "rails_helper"

# docs/specs/admin.md R-31 (AC-6): the session middleware serves /admin only.
RSpec.describe "v1 responses carry no cookies", type: :request do
  it "sets no cookie on GET /v1/health or a v1 write with a token (AC-6)" do
    get "/v1/health"
    expect(response).to have_http_status(:ok)
    expect(response.headers["Set-Cookie"]).to be_nil
    expect(response.headers["Content-Security-Policy"]).to be_nil

    user = create(:user)
    raw = SecureRandom.hex(32)
    create(:session, user: user, token_digest: Digest::SHA256.hexdigest(raw))
    post "/v1/devices", params: { anonymous_id: SecureRandom.uuid, platform: "ios", app_version: "0.1.0" },
                        headers: bearer(raw), as: :json
    expect(response).to have_http_status(:created)
    expect(response.headers["Set-Cookie"]).to be_nil
    expect(response.headers["Content-Security-Policy"]).to be_nil
  end
end
