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

# == Schema Information
#
# Table name: identities
#
#  id                     :uuid             not null, primary key
#  email                  :citext
#  email_verified         :boolean          default(FALSE), not null
#  provider               :text             not null
#  provider_refresh_token :text
#  provider_uid           :text             not null
#  raw_claims             :jsonb            not null
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  user_id                :uuid             not null
#
# Indexes
#
#  index_identities_on_provider_and_provider_uid  (provider,provider_uid) UNIQUE
#  index_identities_on_user_id                    (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
