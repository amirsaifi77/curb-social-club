module Auth
  # Provider settings read lazily from the environment (docs/local-development.md).
  # Gaps item 2: the Apple audience is the bundle id placeholder until the
  # domain is confirmed.
  module Config
    module_function

    def apple_bundle_id = ENV.fetch("APPLE_BUNDLE_ID", "club.curbsocial.app")
    def apple_team_id = ENV["APPLE_TEAM_ID"]
    def apple_key_id = ENV["APPLE_KEY_ID"]
    def apple_private_key = ENV["APPLE_PRIVATE_KEY"]&.gsub("\\n", "\n")
    def apple_configured? = [ apple_team_id, apple_key_id, apple_private_key ].all?(&:present?)
    def google_ios_client_id = ENV["GOOGLE_IOS_CLIENT_ID"]
  end
end
