# Request-time deletion work (R-15): revoke the Apple refresh token, then
# apply the content rules. Only the identity tables exist in Phase 0; each
# Phase 1 and later table adds its step here as its spec lands: delete rsvps,
# check_ins, follows and blocks in both directions, notifications, imports,
# vehicles, and club_memberships (owner to the app account when sole owner);
# hide posts and comments; reject pending claim_requests; move published
# events to the app account as unclaimed and delete drafts.
class AccountDeletionJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find_by(id: user_id)
    return unless user&.deleted?

    revoke_apple_tokens(user)
    user.sessions.delete_all
    user.devices.find_each(&:unlink!)
  end

  private

  def revoke_apple_tokens(user)
    client = Auth::AppleClient.new
    user.identities.where(provider: "apple").find_each do |identity|
      next if identity.provider_refresh_token.blank?

      identity.update!(provider_refresh_token: nil) if client.revoke(identity.provider_refresh_token)
    end
  end
end
