module Auth
  # Shared JWT verification: signature against the provider JWKS, issuer,
  # audience, and expiry. Subclasses add provider-specific claim checks.
  # Every failure raises InvalidToken with the same message.
  class TokenVerifier
    MESSAGE = "invalid token".freeze
    ALGORITHMS = %w[RS256].freeze

    def initialize(jwks:, issuers:, audience:)
      @jwks = jwks
      @issuers = issuers
      @audience = audience
    end

    # Returns the verified claims as a Hash with string keys.
    def verify(token)
      raise InvalidToken, MESSAGE if token.blank? || @audience.blank?

      claims, _header = JWT.decode(
        token, nil, true,
        algorithms: ALGORITHMS,
        jwks: @jwks.loader,
        iss: @issuers, verify_iss: true,
        aud: @audience, verify_aud: true,
        verify_expiration: true
      )
      check!(claims)
      claims
    rescue JWT::DecodeError, JSON::ParserError, InvalidToken
      raise InvalidToken, MESSAGE
    end

    private

    def check!(_claims); end
  end
end
