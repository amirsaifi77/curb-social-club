class Profile < ApplicationRecord
  self.primary_key = :user_id

  HANDLE_FORMAT = /\A[a-z0-9_]{3,24}\z/
  VISIBILITIES = %w[public private].freeze

  belongs_to :user

  validates :handle, presence: true,
                     format: { with: HANDLE_FORMAT, message: "must be 3 to 24 lowercase letters, digits, or underscores" },
                     uniqueness: { case_sensitive: false }
  validates :display_name, presence: true, length: { maximum: 80 }
  validates :bio, length: { maximum: 280 }, allow_nil: true
  validates :visibility, inclusion: { in: VISIBILITIES }
end
