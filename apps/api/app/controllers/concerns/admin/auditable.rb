module Admin
  # Audit trail for the admin UI (docs/specs/admin.md R-1). A controller
  # calls `audit` with what it changed; any non-GET request that completes
  # without an explicit audit is recorded generically after the action, with
  # its filtered params, so a new write (including Mission Control's job
  # actions) cannot ship unaudited.
  module Auditable
    extend ActiveSupport::Concern

    SKIPPED_PARAMS = %w[controller action authenticity_token utf8 commit _method].freeze

    included do
      after_action :audit_unrecorded_write, unless: -> { request.get? || request.head? }
    end

    private

    def audit(action, target: nil, changes: {}, admin: current_admin)
      @audited = true
      AdminAudit.record(admin: admin, action: action, target: target, changes: changes, ip: request.remote_ip)
    end

    # For a non-GET request that changed nothing worth a row (a refused
    # sign-in with a token that never verified), so the generic audit stays quiet.
    def skip_audit
      @audited = true
    end

    def audit_unrecorded_write
      return if @audited || response.status >= 400 || current_admin.nil?

      audit("#{controller_path.delete_prefix('admin/')}##{action_name}",
            changes: { "params" => request.filtered_parameters.except(*SKIPPED_PARAMS) })
    end
  end
end
