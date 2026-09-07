# Nightly hard delete of accounts deleted more than 30 days ago (R-16):
# users, identities, sessions, profiles, and (as their tables land) posts
# with photos, blobs, external media, comments, and the avatar blob, with
# created_by_id on events, venues, clubs, and (later) spots reassigned to
# the app account. Club memberships are released the way the deletion job
# does it, so a user the deletion job missed still purges cleanly. Logs
# each purged user id to Sentry breadcrumbs, never the email (R-29).
class AccountPurgeJob < ApplicationJob
  queue_as :default

  def perform
    User.purgeable.find_each do |user|
      User.transaction do
        user.devices.find_each(&:unlink!)
        reassign_created_rows(user)
        ClubMembership.release_for(user, successor: app_account) if user.club_memberships.exists?
        user.destroy!
      end
      breadcrumb(user.id)
    end
  end

  private

  def reassign_created_rows(user)
    [ user.created_events, user.created_venues, user.created_clubs ].each do |rows|
      next unless rows.exists?

      rows.update_all(created_by_id: app_account.id, updated_at: Time.current)
    end
  end

  def app_account
    @app_account ||= User.app_account || raise("app account (handle curb) is missing; run db:seed")
  end

  def breadcrumb(user_id)
    return unless defined?(Sentry) && Sentry.initialized?

    Sentry.add_breadcrumb(Sentry::Breadcrumb.new(category: "accounts", message: "purged user #{user_id}"))
  end
end
