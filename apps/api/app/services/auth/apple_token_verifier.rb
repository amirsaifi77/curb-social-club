module Auth
  # Sign in with Apple identity tokens (R-6): Apple JWKS, iss
  # https://appleid.apple.com, aud equal to the iOS bundle id, exp, and the
  # nonce claim equal to SHA256 of the raw nonce the client sent.
  class AppleTokenVerifier < TokenVerifier
    JWKS_URL = "https://appleid.apple.com/auth/keys".freeze
    ISSUER = "https://appleid.apple.com".freeze

    def initialize(audience: Config.apple_bundle_id)
      super(jwks: Jwks.new(JWKS_URL, cache_key: "apple"), issuers: [ ISSUER ], audience: audience)
    end

    def verify(token, nonce:)
      @nonce = nonce
      super(token)
    end

    private

    def check!(claims)
      expected = @nonce.present? ? Digest::SHA256.hexdigest(@nonce) : nil
      actual = claims["nonce"].to_s
      raise InvalidToken, MESSAGE unless expected && ActiveSupport::SecurityUtils.secure_compare(expected, actual)
    end
  end
end
