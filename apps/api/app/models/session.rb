class Session < ApplicationRecord
  LIFETIME = 90.days
  REFRESH_WHEN_UNDER = 30.days
  TOUCH_INTERVAL = 1.hour

  belongs_to :user
  belongs_to :device, optional: true

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :expired, -> { where(expires_at: ...Time.current) }
  scope :live, -> { where(expires_at: Time.current..) }

  def expired? = expires_at <= Time.current

  # Sliding expiry (R-11): refresh to 90 days when under 30 remain; write
  # expires_at and last_used_at at most once per hour.
  def touch_usage!(now: Time.current)
    return if last_used_at && last_used_at > now - TOUCH_INTERVAL

    attrs = { last_used_at: now }
    attrs[:expires_at] = now + LIFETIME if expires_at < now + REFRESH_WHEN_UNDER
    update_columns(attrs)
  end
end

# == Schema Information
#
# Table name: sessions
#
#  id           :uuid             not null, primary key
#  expires_at   :timestamptz      not null
#  ip           :inet
#  last_used_at :timestamptz
#  token_digest :text             not null
#  user_agent   :text
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  device_id    :uuid
#  user_id      :uuid             not null
#
# Indexes
#
#  index_sessions_on_device_id     (device_id)
#  index_sessions_on_expires_at    (expires_at)
#  index_sessions_on_token_digest  (token_digest) UNIQUE
#  index_sessions_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (device_id => devices.id)
#  fk_rails_...  (user_id => users.id)
#
