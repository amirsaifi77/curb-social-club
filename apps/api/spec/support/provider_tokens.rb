# Signed provider tokens and WebMock stubs for Apple and Google. Keys are
# generated once per process; nothing here touches the network.
module ProviderTokens
  APPLE_KEY = OpenSSL::PKey::RSA.new(2048)
  GOOGLE_KEY = OpenSSL::PKey::RSA.new(2048)
  ROGUE_KEY = OpenSSL::PKey::RSA.new(2048)
  APPLE_KID = "apple-test-kid".freeze
  GOOGLE_KID = "google-test-kid".freeze
  APPLE_SIGNING_KEY = OpenSSL::PKey::EC.generate("prime256v1")

  ENV["GOOGLE_IOS_CLIENT_ID"] ||= "curb-ios-test.apps.googleusercontent.com"
  ENV["APPLE_TEAM_ID"] ||= "TEAMTEST01"
  ENV["APPLE_KEY_ID"] ||= "KEYTEST01"
  ENV["APPLE_PRIVATE_KEY"] ||= APPLE_SIGNING_KEY.to_pem

  def jwks_for(key, kid)
    { keys: [ JWT::JWK.new(key, { kid: kid }).export ] }
  end

  def stub_provider_endpoints
    stub_request(:get, Auth::AppleTokenVerifier::JWKS_URL)
      .to_return(status: 200, body: jwks_for(APPLE_KEY, APPLE_KID).to_json, headers: { "Content-Type" => "application/json" })
    stub_request(:get, Auth::GoogleTokenVerifier::JWKS_URL)
      .to_return(status: 200, body: jwks_for(GOOGLE_KEY, GOOGLE_KID).to_json, headers: { "Content-Type" => "application/json" })
    stub_request(:post, Auth::AppleClient::TOKEN_URL.to_s)
      .to_return(status: 200, body: { refresh_token: "apple-refresh-test" }.to_json, headers: { "Content-Type" => "application/json" })
    stub_request(:post, Auth::AppleClient::REVOKE_URL.to_s).to_return(status: 200, body: "")
  end

  def apple_nonce = "raw-nonce-#{SecureRandom.hex(4)}"

  def apple_token(sub: "apple-#{SecureRandom.hex(6)}", email: "#{SecureRandom.hex(4)}@example.com", nonce: "nonce", email_verified: "true", key: APPLE_KEY, kid: APPLE_KID, **overrides)
    claims = {
      iss: Auth::AppleTokenVerifier::ISSUER,
      aud: Auth::Config.apple_bundle_id,
      exp: 10.minutes.from_now.to_i,
      iat: Time.current.to_i,
      sub: sub,
      email: email,
      email_verified: email_verified,
      nonce: Digest::SHA256.hexdigest(nonce),
      nonce_supported: true
    }.merge(overrides)
    JWT.encode(claims, key, "RS256", { kid: kid })
  end

  def google_token(sub: "google-#{SecureRandom.hex(6)}", email: "#{SecureRandom.hex(4)}@gmail.com", name: "Test Person", email_verified: true, key: GOOGLE_KEY, kid: GOOGLE_KID, **overrides)
    claims = {
      iss: "https://accounts.google.com",
      aud: Auth::Config.google_ios_client_id,
      exp: 10.minutes.from_now.to_i,
      iat: Time.current.to_i,
      sub: sub,
      email: email,
      email_verified: email_verified,
      name: name
    }.merge(overrides)
    JWT.encode(claims, key, "RS256", { kid: kid })
  end

  def apple_params(nonce:, **token_opts)
    { identity_token: apple_token(nonce: nonce, **token_opts), authorization_code: "code-#{SecureRandom.hex(4)}", nonce: nonce }
  end

  def bearer(token) = { "Authorization" => "Bearer #{token}" }

  def json = JSON.parse(response.body)
end
