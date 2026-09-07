# Request-time deletion work (R-15): revoke the Apple refresh token, then
# apply the content rules. Each table adds its step here as its spec lands.
# Landed with the Phase 1 host migration: club_memberships (owner to the
# app account when sole owner), pending claim_requests rejected, hosted
# events moved to the app account as unclaimed and drafts deleted. Still to
# come: rsvps, check_ins, follows and blocks in both directions,
# notifications, imports, vehicles; hide posts and comments.
class AccountDeletionJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user&.deleted?

    revoke_apple_tokens(user)
    user.sessions.delete_all
    user.devices.find_each(&:unlink!)
    ClubMembership.release_for(user, successor: app_account) if user.club_memberships.exists?
    reject_claim_requests(user)
    hand_over_hosted_events(user)
  end

  private

  def revoke_apple_tokens(user)
    client = Auth::AppleClient.new
    user.identities.where(provider: "apple").find_each do |identity|
      next if identity.provider_refresh_token.blank?

      identity.update!(provider_refresh_token: nil) if client.revoke(identity.provider_refresh_token)
    end
  end

  def reject_claim_requests(user)
    user.claim_requests.pending.update_all(status: "rejected", reviewed_at: Time.current,
                                           review_note: "Account deleted", updated_at: Time.current)
  end

  # Published (and cancelled) events keep their page under the app account,
  # unclaimed; drafts go with the user.
  def hand_over_hosted_events(user)
    Event.where(host_type: "User", host_id: user.id).find_each do |event|
      if event.draft?
        event.destroy!
      else
        event.update!(host: app_account, claimed_at: nil)
      end
    end
  end

  def app_account
    @app_account ||= User.app_account || raise("app account (handle curb) is missing; run db:seed")
  end
end
