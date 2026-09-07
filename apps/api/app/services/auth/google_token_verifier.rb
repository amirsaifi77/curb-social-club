module Auth
  # Google id tokens (R-9): Google JWKS, iss accounts.google.com or
  # https://accounts.google.com, aud equal to the given client id, exp, and
  # email_verified. admin.md reuses this class with the admin client id.
  class GoogleTokenVerifier < TokenVerifier
    JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs".freeze
    ISSUERS = %w[accounts.google.com https://accounts.google.com].freeze

    def initialize(audience: Config.google_ios_client_id)
      super(jwks: Jwks.new(JWKS_URL, cache_key: "google"), issuers: ISSUERS, audience: audience)
    end

    private

    def check!(claims)
      verified = claims["email_verified"]
      raise InvalidToken, MESSAGE unless verified == true || verified == "true"
    end
  end
end
