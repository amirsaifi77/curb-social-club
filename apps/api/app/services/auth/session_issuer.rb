module Auth
  # Opaque session tokens (R-2, ADR 0006): 32 random bytes, base64url, only
  # the SHA256 digest stored, 90-day sliding expiry.
  class SessionIssuer
    Issued = Struct.new(:token, :session)

    def self.digest(token)
      Digest::SHA256.hexdigest(token.to_s)
    end

    def self.issue(user, device: nil, ip: nil, user_agent: nil)
      token = SecureRandom.urlsafe_base64(32)
      session = user.sessions.create!(
        device: device,
        token_digest: digest(token),
        expires_at: Session::LIFETIME.from_now,
        last_used_at: Time.current,
        ip: ip,
        user_agent: user_agent&.first(512)
      )
      Issued.new(token, session)
    end

    # The live session for a raw token, or nil.
    def self.find(token)
      return nil if token.blank?

      Session.live.includes(:user).find_by(token_digest: digest(token))
    end
  end
end
