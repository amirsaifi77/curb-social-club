require "net/http"

module Auth
  # Apple's token endpoints: exchange the authorization code for a refresh
  # token at sign-in (R-8) and revoke it at deletion (R-15). Both need a
  # client secret JWT signed with the Sign in with Apple key from the
  # environment; without the key both calls are skipped.
  class AppleClient
    TOKEN_URL = URI("https://appleid.apple.com/auth/token")
    REVOKE_URL = URI("https://appleid.apple.com/auth/revoke")
    AUDIENCE = "https://appleid.apple.com".freeze

    def self.configured? = Config.apple_configured?

    # Returns the refresh token, or nil when Apple is not configured or the
    # exchange fails (sign-in still succeeds; revocation is best effort).
    def exchange_code(authorization_code)
      return nil if authorization_code.blank? || !self.class.configured?

      response = post(TOKEN_URL, grant_type: "authorization_code", code: authorization_code)
      return nil unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)["refresh_token"].presence
    rescue JSON::ParserError, SocketError, Timeout::Error, OpenSSL::SSL::SSLError
      nil
    end

    def revoke(refresh_token)
      return false if refresh_token.blank? || !self.class.configured?

      response = post(REVOKE_URL, token: refresh_token, token_type_hint: "refresh_token")
      response.is_a?(Net::HTTPSuccess)
    rescue SocketError, Timeout::Error, OpenSSL::SSL::SSLError
      false
    end

    # ES256 client secret per Apple's docs: iss team id, sub bundle id.
    def client_secret(now: Time.current)
      key = OpenSSL::PKey::EC.new(Config.apple_private_key)
      payload = {
        iss: Config.apple_team_id,
        iat: now.to_i,
        exp: (now + 5.minutes).to_i,
        aud: AUDIENCE,
        sub: Config.apple_bundle_id
      }
      JWT.encode(payload, key, "ES256", kid: Config.apple_key_id)
    end

    private

    def post(url, params)
      body = URI.encode_www_form(params.merge(client_id: Config.apple_bundle_id, client_secret: client_secret))
      Net::HTTP.post(url, body, "Content-Type" => "application/x-www-form-urlencoded")
    end
  end
end
