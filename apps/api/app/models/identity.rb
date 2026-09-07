class Identity < ApplicationRecord
  PROVIDERS = %w[apple google].freeze
  APPLE_RELAY_DOMAIN = "privaterelay.appleid.com".freeze

  belongs_to :user

  # Apple refresh token for revocation at deletion (docs/data-model.md).
  encrypts :provider_refresh_token

  validates :provider, inclusion: { in: PROVIDERS }
  validates :provider_uid, presence: true, uniqueness: { scope: :provider }

  def self.relay_email?(email)
    email.to_s.downcase.end_with?("@#{APPLE_RELAY_DOMAIN}")
  end

  def relay_email? = self.class.relay_email?(email)
end
