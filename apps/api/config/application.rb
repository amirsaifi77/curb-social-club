require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
# require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module CurbSocialClub
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # The admin UI (docs/specs/admin.md R-6) is the one cookie surface: an
    # encrypted cookie session for admin and moderator users, 12 hours,
    # lax, secure outside development and test. Api::V1 controllers stay on
    # ActionController::API and never touch the session, so no /v1 response
    # carries Set-Cookie (R-31). Rack::MethodOverride turns the sign-out
    # form's _method=delete into DELETE before rack-attack counts it.
    config.middleware.use Rack::MethodOverride
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore,
                          key: "_curb_admin", same_site: :lax, secure: !Rails.env.local?,
                          expire_after: 12.hours, httponly: true
    config.middleware.use ActionDispatch::Flash
    # Writes the policy Admin::BaseController sets; /v1 sets none, so its
    # responses carry no CSP header. API-only stacks omit this middleware.
    config.middleware.use ActionDispatch::ContentSecurityPolicy::Middleware

    # Mission Control (admin.md R-12) at /admin/jobs behind the admin session:
    # its controllers inherit Admin::BaseController, so the session and role
    # guards run first and HTTP basic auth is off. It inspects Solid Queue
    # whatever Active Job uses in the current environment. These must be set
    # here, not in an initializer: the engine copies them before_initialize.
    config.mission_control.jobs.base_controller_class = "Admin::BaseController"
    config.mission_control.jobs.http_basic_auth_enabled = false
    config.mission_control.jobs.adapters = [ :solid_queue ]
    config.mission_control.jobs.back_to_main_app_path = "/admin"

    # structure.sql, because PostGIS types do not round-trip through schema.rb.
    config.active_record.schema_format = :sql

    # UUID primary keys everywhere (docs/data-model.md).
    config.generators do |g|
      g.orm :active_record, primary_key_type: :uuid
    end
  end
end
