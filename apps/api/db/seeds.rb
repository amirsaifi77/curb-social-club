# The app account: host of record for unclaimed events and owner of seeded
# clubs (docs/data-model.md, gaps item 5). It has no identity and cannot sign
# in. Seeded venues and meets arrive with Phase 1 (docs/local-development.md).
app_account = User.app_account || User.transaction do
  user = User.create!(role: "admin", status: "active", terms_accepted_at: Time.current)
  Profile.create!(user: user, handle: "curb", display_name: "Curb Social Club", is_host: true, system_account: true)
  user
end
puts "App account: #{app_account.id} (@curb)"

# The seed CSVs, in dependency order: an event row naming an unknown club or
# sponsor slug is a row error, so those files import first (admin.md Data,
# Import order). A file that is not present is skipped, so a fresh database
# is usable before the verified rows are written.
Seeds::Runner.import_all
