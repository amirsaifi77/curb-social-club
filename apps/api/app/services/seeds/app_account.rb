module Seeds
  # The app account: host of record for unclaimed events and owner of seeded
  # clubs (docs/data-model.md, gaps item 5). It has no identity and cannot
  # sign in. `db/seeds.rb` and `seeds:dev` both need it to exist before any
  # CSV row is read, so the definition lives here rather than in either.
  module AppAccount
    HANDLE = "curb".freeze
    DISPLAY_NAME = "Curb Social Club".freeze

    def self.ensure!(now: Time.current)
      User.app_account || User.transaction do
        user = User.create!(role: "admin", status: "active", terms_accepted_at: now)
        Profile.create!(user: user, handle: HANDLE, display_name: DISPLAY_NAME,
                        is_host: true, system_account: true)
        user
      end
    end
  end
end
