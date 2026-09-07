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
