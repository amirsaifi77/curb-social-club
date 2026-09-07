module Admin
  # A01 sign-in (docs/specs/admin.md R-7, R-8). The page renders the Google
  # Identity Services button; admin.js posts the credential here with the
  # Rails CSRF token, the verifier checks it against GOOGLE_ADMIN_CLIENT_ID,
  # and only an active admin or moderator gets a session.
  class SessionsController < BaseController
    NOT_AN_ADMIN = "This Google account is not an admin.".freeze
    INVALID_TOKEN = "Couldn't verify that sign-in. Try again.".freeze
    SIGNED_OUT = "Signed out.".freeze

    skip_before_action :require_admin_session, only: %i[new create]
    skip_before_action :require_admin_role

    def new
      redirect_to admin_root_path if current_admin
    end

    # A verified token for a user who is not active staff is audited as
    # sign_in_refused with the Google sub (R-1); a token that never
    # verified is not worth a row.
    def create
      claims = Auth::GoogleTokenVerifier.new(audience: Auth::Config.google_admin_client_id).verify(params[:credential])
      user = Identity.find_by(provider: "google", provider_uid: claims["sub"])&.user
      unless staff?(user)
        audit("sign_in_refused", target: user, changes: { "sub" => claims["sub"] })
        return redirect_to admin_sign_in_path, alert: NOT_AN_ADMIN
      end

      reset_session
      session[:admin_user_id] = user.id
      audit("sign_in", target: user, admin: user)
      redirect_to admin_root_path
    rescue Auth::InvalidToken
      skip_audit
      redirect_to admin_sign_in_path, alert: INVALID_TOKEN
    end

    def destroy
      audit("sign_out", target: current_admin)
      reset_session
      redirect_to admin_sign_in_path, notice: SIGNED_OUT
    end

    private

    def staff?(user)
      user.present? && user.active? && STAFF_ROLES.include?(user.role)
    end
  end
end
