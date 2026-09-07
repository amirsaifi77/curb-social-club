module Events
  # The share token for an unlisted event (event-detail-and-rsvp.md R-5):
  # an HMAC of the event id keyed from secret_key_base, with no expiry
  # because the link is the secret. Rotating secret_key_base invalidates
  # every link that is out, which is the intended escape hatch.
  class UnlistedToken
    PURPOSE = "unlisted_event"

    def self.generate(event_id)
      verifier.generate(event_id.to_s, purpose: PURPOSE)
    end

    def self.valid?(token, event_id)
      return false if token.blank?

      verifier.verified(token.to_s, purpose: PURPOSE) == event_id.to_s
    end

    def self.verifier
      Rails.application.message_verifier(PURPOSE)
    end
    private_class_method :verifier
  end
end
