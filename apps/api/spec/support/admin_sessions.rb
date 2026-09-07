# Admin cookie sessions for request specs (docs/specs/admin.md Verification).
# sign_in_admin and sign_in_moderator go through POST /admin/session with a
# Google id token signed by the test JWKS (ProviderTokens), so the real
# verifier runs; set_admin_session writes the encrypted cookie directly for
# the member sweep (AC-2).
module AdminSessions
  ENV["GOOGLE_ADMIN_CLIENT_ID"] ||= "curb-admin-test.apps.googleusercontent.com"

  SESSION_COOKIE = "_curb_admin".freeze

  def admin_google_token(user, **overrides)
    identity = user.identities.find_by(provider: "google") || create(:identity, user: user)
    google_token(sub: identity.provider_uid, email: user.email, aud: Auth::Config.google_admin_client_id, **overrides)
  end

  def sign_in_admin(user) = sign_in_staff(user)
  def sign_in_moderator(user) = sign_in_staff(user)

  def sign_in_staff(user)
    post "/admin/session", params: { credential: admin_google_token(user) }
    expect(response).to redirect_to("/admin")
  end

  def set_admin_session(user)
    env_request = ActionDispatch::Request.new(Rails.application.env_config.deep_dup)
    # A bare Hash would be read as cookie options; the session data goes under :value.
    env_request.cookie_jar.encrypted[SESSION_COOKIE] = { value: { "session_id" => SecureRandom.hex(16), "admin_user_id" => user.id } }
    cookies[SESSION_COOKIE] = env_request.cookie_jar[SESSION_COOKIE]
  end

  def admin_session_user_id
    request.session[:admin_user_id]
  end

  # Rendered flash copy, HTML entities decoded.
  def flash_text
    Nokogiri::HTML(response.body).css(".flash").map(&:text).join(" ").squish
  end

  def csrf_token_from(html)
    Nokogiri::HTML(html).at("meta[name=csrf-token]")&.[]("content")
  end

  def with_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    yield
  ensure
    ActionController::Base.allow_forgery_protection = false
  end

  ALL_VERBS = %w[GET POST PUT PATCH DELETE].freeze

  # Every route under /admin, engine routes included, as [verb, path] pairs
  # with route parameters still symbolic (R-30). A route with no verb (a
  # `via: :all` match or a mounted Rack app) expands to every verb rather
  # than vanishing from the sweep.
  def admin_routes(route_set = Rails.application.routes, prefix = "")
    route_set.routes.flat_map do |route|
      path = prefix + route.path.spec.to_s.sub("(.:format)", "")
      app = route.app.respond_to?(:app) ? route.app.app : route.app
      if app.is_a?(Class) && app < Rails::Engine
        admin_routes(app.routes, path.chomp("/"))
      elsif path.start_with?("/admin")
        verbs = route.verb.to_s.split("|").presence || ALL_VERBS
        verbs.map { |verb| [ verb, path ] }
      else
        []
      end
    end.uniq
  end

  def concrete_path(path)
    path.gsub(/:[a-z_]+/) { SecureRandom.uuid }
  end
end

RSpec.configure do |config|
  config.include AdminSessions, type: :request
end
