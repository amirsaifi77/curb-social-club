# Rate limits from docs/api.md: anonymous 60/min per IP, authenticated
# 300/min per token, /auth/* 10/min per IP (R-19). Backed by Rails.cache
# (Solid Cache in production). Disabled in test except the rack_attack spec.
class Rack::Attack
  AUTH_PATH = %r{\A/v1/auth/}

  throttle("auth/ip", limit: 10, period: 60) do |req|
    req.ip if req.path.match?(AUTH_PATH)
  end

  throttle("v1/token", limit: 300, period: 60) do |req|
    auth = req.get_header("HTTP_AUTHORIZATION").to_s
    Digest::SHA256.hexdigest(auth) if req.path.start_with?("/v1/") && auth.start_with?("Bearer ")
  end

  throttle("v1/ip", limit: 60, period: 60) do |req|
    req.ip if req.path.start_with?("/v1/") && !req.get_header("HTTP_AUTHORIZATION").to_s.start_with?("Bearer ")
  end

  self.throttled_responder = lambda do |request|
    match = request.env["rack.attack.match_data"]
    retry_after = match ? (match[:period] - (Time.now.to_i % match[:period])).to_s : "60"
    body = { error: { code: "rate_limited", message: "Too many requests. Try again shortly." } }.to_json
    [ 429, { "Content-Type" => "application/json", "Retry-After" => retry_after }, [ body ] ]
  end
end

Rack::Attack.enabled = !Rails.env.test?
