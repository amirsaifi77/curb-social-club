module Auth
  # Finds or creates the identity and user for verified provider claims,
  # applies the linking rules (R-5), restores a soft-deleted account (R-17),
  # links the device (R-10), and issues a session (R-2).
  class SignIn
    Result = Struct.new(:token, :session, :user, :is_new, keyword_init: true)

    # display_name: the provider's name for a new account (Apple full_name
    # only arrives on first authorization, R-7). refresh_token: Apple only.
    def initialize(provider:, claims:, display_name: nil, refresh_token: nil, device: nil, ip: nil, user_agent: nil)
      @provider = provider
      @claims = claims
      @display_name = display_name
      @refresh_token = refresh_token
      @device = device
      @ip = ip
      @user_agent = user_agent
    end

    def call
      user = nil
      is_new = false

      ActiveRecord::Base.transaction do
        identity = Identity.find_by(provider: @provider, provider_uid: @claims["sub"])
        if identity
          user = identity.user
          restore(user) if user.deleted?
        else
          user = find_linkable_user
          if user.nil?
            user = create_user
            is_new = true
          end
          identity = user.identities.build(provider: @provider, provider_uid: @claims["sub"])
        end

        identity.assign_attributes(
          email: @claims["email"],
          email_verified: verified?,
          raw_claims: @claims.except("nonce", "at_hash", "c_hash")
        )
        identity.provider_refresh_token = @refresh_token if @refresh_token.present?
        identity.save!
        user.update!(last_seen_at: Time.current)
      end

      raise Suspended if user.suspended?

      @device&.update!(user: user)
      issued = SessionIssuer.issue(user, device: @device, ip: @ip, user_agent: @user_agent)
      Result.new(token: issued.token, session: issued.session, user: user, is_new: is_new)
    end

    private

    def verified?
      v = @claims["email_verified"]
      v == true || v == "true"
    end

    # A verified, non-relay provider email (R-5); nil otherwise.
    def linkable_email
      email = @claims["email"]
      return nil unless verified? && email.present? && !Identity.relay_email?(email)

      email
    end

    # Link to an existing active user only on a linkable email match.
    def find_linkable_user
      email = linkable_email
      email && User.active.find_by(email: email)
    end

    def create_user
      user = User.create!(email: linkable_email, terms_accepted_at: Time.current)
      handle = HandleGenerator.call(@display_name, @claims["email"].to_s.split("@").first)
      Profile.create!(user: user, handle: handle, display_name: @display_name.presence || handle)
      user
    end

    # R-17: signing in during the 30-day window restores the account.
    def restore(user)
      user.update!(status: "active", deleted_at: nil)
      AccountRestoreJob.perform_later(user.id)
    end
  end
end
