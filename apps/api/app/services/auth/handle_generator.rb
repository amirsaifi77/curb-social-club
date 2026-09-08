module Auth
  # profiles.handle at sign-up (R-4): lowercase [a-z0-9_], 3 to 24 chars,
  # from the provider name or the email local part, with 2 to 4 random digits
  # appended on collision. A reserved handle (R-1) counts as a collision, so
  # someone named Support signs up as support12 rather than failing.
  class HandleGenerator
    FALLBACK = "member".freeze

    def self.call(*candidates)
      base = candidates.map { |c| normalize(c) }.find { |c| c.length >= 3 } || FALLBACK
      handle = base
      until available?(handle)
        suffix = SecureRandom.random_number(10**rand(2..4)).to_s.rjust(2, "0")
        handle = "#{base.first(24 - suffix.length)}#{suffix}"
      end
      handle
    end

    def self.available?(handle)
      Profile.where(handle: handle).none? && !Profile.reserved_handles.include?(handle)
    end

    def self.normalize(value)
      value.to_s.downcase.gsub(/[^a-z0-9_]+/, "_").gsub(/\A_+|_+\z/, "").squeeze("_").first(24)
    end
  end
end
