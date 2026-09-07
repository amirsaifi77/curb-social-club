require "net/http"

module Auth
  # Fetches a provider's JWKS over HTTPS and caches it in Solid Cache for
  # 24 hours; an unknown kid forces one refetch (R-6, ADR 0006).
  class Jwks
    TTL = 24.hours

    def initialize(url, cache_key:)
      @url = URI(url)
      @cache_key = "jwks:#{cache_key}"
    end

    # Shape expected by the jwt gem's jwks option: a lambda receiving
    # { kid_not_found: true } when the token's kid is missing from the set.
    def loader
      lambda do |options|
        Rails.cache.delete(@cache_key) if options[:kid_not_found]
        fetch
      end
    end

    def fetch
      Rails.cache.fetch(@cache_key, expires_in: TTL) do
        response = Net::HTTP.get_response(@url)
        raise InvalidToken, "jwks unavailable" unless response.is_a?(Net::HTTPSuccess)

        JSON.parse(response.body, symbolize_names: true)
      end
    end
  end
end
