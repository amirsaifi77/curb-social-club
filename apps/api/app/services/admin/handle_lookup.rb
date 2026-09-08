module Admin
  # Finds a user by profile handle for the admin's by-handle pickers (A05
  # memberships, the club owner field). A leading @ and case are forgiven;
  # anything that is not an active user's handle is nil, so the caller
  # surfaces a form error rather than a 404.
  module HandleLookup
    UNKNOWN = "No active user with that handle.".freeze

    def self.call(handle)
      normalized = handle.to_s.strip.delete_prefix("@").downcase
      return nil if normalized.blank?

      Profile.where(handle: normalized).joins(:user).merge(User.active).first&.user
    end
  end
end
