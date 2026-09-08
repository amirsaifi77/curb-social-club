module Admin
  # The hide, unhide, verify, and unverify buttons A05 and A06 share
  # (docs/specs/admin.md R-18, R-19). Each is its own route so each is its
  # own audit action, and hiding is never a delete: a hidden club or
  # sponsor keeps hosting its events (clubs R-5, sponsors R-5). The
  # including controller loads @record for ACTIONS as well as its own,
  # because a second before_action for one method replaces the first.
  module VisibilityActions
    extend ActiveSupport::Concern

    ACTIONS = %i[hide unhide verify unverify].freeze

    def hide = flip(status: "hidden")
    def unhide = flip(status: "active")
    def verify = flip(verified: true)
    def unverify = flip(verified: false)

    private

    def flip(attributes)
      @record.update!(attributes)
      audit(action_name, target: @record, changes: attributes.transform_keys(&:to_s).transform_values(&:to_s))
      redirect_back_or_to record_path(@record), notice: t_flash(action_name, @record)
    end

    def t_flash(action, record)
      { "hide" => "#{record.name} is hidden.", "unhide" => "#{record.name} is visible again.",
        "verify" => "#{record.name} is verified.", "unverify" => "#{record.name} is no longer verified." }.fetch(action)
    end
  end
end
