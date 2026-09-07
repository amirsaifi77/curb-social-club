# Bearer session lookup for /v1 (R-11, R-20): a missing, unknown, or expired
# token is anonymous on anonymous-allowed endpoints and 401 where a user is
# required; a suspended user's token is 403 everywhere it is used.
module Authenticate
  extend ActiveSupport::Concern

  included do
    helper_method :current_user, :current_session if respond_to?(:helper_method)
  end

  private

  def current_session
    return @current_session if defined?(@current_session)

    @current_session = Auth::SessionIssuer.find(bearer_token)&.tap(&:touch_usage!)
  end

  def current_user
    current_session&.user
  end

  def signed_in? = current_user.present?

  def require_user!
    if current_user.nil?
      render_error(:unauthenticated, "Sign in to continue", status: :unauthorized)
    elsif current_user.suspended?
      render_error(:forbidden, "This account is suspended", status: :forbidden, details: { reason: "suspended" })
    end
  end

  def bearer_token
    header = request.authorization.to_s
    header.delete_prefix("Bearer ").strip if header.start_with?("Bearer ")
  end

  # X-Device-Id (docs/api.md Conventions); the device row is created on first
  # sight so sign-in can always link it (R-10).
  def device_header
    request.headers["X-Device-Id"].to_s.strip.presence
  end

  def current_device
    return @current_device if defined?(@current_device)

    id = device_header
    @current_device = id&.match?(Device::UUID) ? Device.find_or_create_by!(anonymous_id: id.downcase) { |d| d.platform = "ios" } : nil
  end
end
