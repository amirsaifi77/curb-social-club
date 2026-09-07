# The first admin is granted here, never through the UI (docs/specs/admin.md R-10).
#   bin/rails "admin:grant[you@example.com]"
#   bin/rails "admin:grant[you@example.com,moderator]"
namespace :admin do
  desc "Set a user's role to admin (or the given role) by email"
  task :grant, [ :email, :role ] => :environment do |_task, args|
    role = args[:role].presence || "admin"
    abort "Role must be one of #{User::ROLES.join(', ')}" unless User::ROLES.include?(role)

    user = User.find_by(email: args[:email].to_s.strip) # citext, so case does not matter
    abort "No user with email #{args[:email].inspect}. They need to sign in to the app once first." unless user
    abort "#{user.email} is #{user.status}; only an active user can hold the #{role} role." unless user.active?

    user.update!(role: role)
    AdminAudit.record(admin: nil, action: "grant_role", target: user, changes: { "role" => role, "via" => "rake" })
    puts "#{user.email} is now #{role}."
  end
end
