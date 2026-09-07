module Admin
  # Base of every admin controller (docs/specs/admin.md R-5): a full
  # ActionController::Base with the encrypted cookie session, CSRF, flash,
  # the admin layout, and the two guards. Api::V1 controllers never inherit
  # this; they stay on ActionController::API and cookie-free (R-31).
  #
  # Screens are admin-only by default (R-9). A controller a moderator may
  # use sets `self.moderator_access = true`. Mission Control's controllers
  # inherit the default, so /admin/jobs is admin-only (R-12).
  class BaseController < ActionController::Base
    include Admin::Auditable

    STAFF_ROLES = %w[admin moderator].freeze
    ROLE_FLASH = "That page needs the admin role.".freeze

    protect_from_forgery with: :exception
    layout "admin"

    class_attribute :moderator_access, default: false

    before_action :require_admin_session
    before_action :require_admin_role

    helper_method :current_admin

    # /admin only (R-7): scripts from this host and Google Identity Services,
    # the GIS button iframe, nothing inline. Mission Control's importmap tags
    # carry the per-request nonce (config/initializers/content_security_policy.rb).
    content_security_policy do |policy|
      policy.default_src :self
      policy.script_src :self, "https://accounts.google.com"
      policy.style_src :self, "https://accounts.google.com/gsi/style"
      policy.frame_src "https://accounts.google.com"
      policy.connect_src :self, "https://accounts.google.com/gsi/"
      policy.img_src :self, :data
      policy.font_src :self
      policy.object_src :none
      policy.base_uri :self
      policy.form_action :self
      policy.frame_ancestors :none
    end

    private

    # The signed-in staff user, re-checked on every request so a demoted or
    # suspended user drops out at their next click, not at cookie expiry.
    def current_admin
      return @current_admin if defined?(@current_admin)

      id = session[:admin_user_id]
      @current_admin = id.present? ? User.active.where(role: STAFF_ROLES).find_by(id: id) : nil
    end

    def require_admin_session
      redirect_to admin_sign_in_path unless current_admin
    end

    def require_admin_role
      return if moderator_access || current_admin.admin?

      redirect_to admin_root_path, alert: ROLE_FLASH
    end
  end
end
