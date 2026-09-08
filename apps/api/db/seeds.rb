# The app account, then the verified seed CSVs. Both are idempotent, so
# `bin/rails db:seed` is safe to re-run. Fabricated development rows are a
# separate task, `bin/rails seeds:dev` (docs/local-development.md).
app_account = Seeds::AppAccount.ensure!
puts "App account: #{app_account.id} (@#{Seeds::AppAccount::HANDLE})"

# The seed CSVs, in dependency order: an event row naming an unknown club or
# sponsor slug is a row error, so those files import first (admin.md Data,
# Import order). A file that is not present is skipped, so a fresh database
# is usable before the verified rows are written.
Seeds::Runner.import_all
