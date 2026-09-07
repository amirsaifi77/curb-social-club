# Nightly hard delete of accounts deleted more than 30 days ago (R-16):
# users, identities, sessions, profiles, and (as their tables land) posts
# with photos, blobs, external media, comments, and the avatar blob, with
# created_by_id on events, venues, and spots reassigned to the app account.
# Logs each purged user id to Sentry breadcrumbs, never the email (R-29).
class AccountPurgeJob < ApplicationJob
  queue_as :default

  def perform
    User.purgeable.find_each do |user|
      User.transaction do
        user.devices.find_each(&:unlink!)
        user.destroy!
      end
      breadcrumb(user.id)
    end
  end

  private

  def breadcrumb(user_id)
    return unless defined?(Sentry) && Sentry.initialized?

    Sentry.add_breadcrumb(Sentry::Breadcrumb.new(category: "accounts", message: "purged user #{user_id}"))
  end
end
