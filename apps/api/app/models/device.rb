class Device < ApplicationRecord
  PLATFORMS = %w[ios android web].freeze
  UUID = /\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i

  belongs_to :user, optional: true
  has_many :sessions, dependent: :nullify

  validates :anonymous_id, presence: true, uniqueness: true, format: { with: UUID }
  validates :platform, inclusion: { in: PLATFORMS }

  # Sign-out and deletion clear the link and the push token together (R-3).
  def unlink!
    update!(user: nil, push_token: nil)
  end
end

# == Schema Information
#
# Table name: devices
#
#  id            :uuid             not null, primary key
#  app_version   :text
#  home_location :geography        point, 4326
#  last_seen_at  :timestamptz
#  platform      :text             not null
#  push_enabled  :boolean          default(TRUE), not null
#  push_token    :text
#  timezone      :text
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  anonymous_id  :uuid             not null
#  user_id       :uuid
#
# Indexes
#
#  index_devices_on_anonymous_id  (anonymous_id) UNIQUE
#  index_devices_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
