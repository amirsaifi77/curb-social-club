class User < ApplicationRecord
  ROLES = %w[member moderator admin].freeze
  STATUSES = %w[active suspended deleted].freeze
  PURGE_AFTER = 30.days

  has_many :identities, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :devices, dependent: :nullify
  has_one :profile, dependent: :destroy

  validates :role, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }
  validates :email, uniqueness: { case_sensitive: false }, allow_nil: true

  scope :active, -> { where(status: "active") }
  scope :purgeable, -> { where(status: "deleted").where(deleted_at: ...PURGE_AFTER.ago) }

  # The seeded system account (profiles.handle "curb") that hosts unclaimed
  # events and owns seeded clubs. It cannot sign in.
  def self.app_account
    Profile.find_by(handle: "curb")&.user
  end

  def admin? = role == "admin"
  def moderator? = role == "moderator"
  def suspended? = status == "suspended"
  def deleted? = status == "deleted"
  def active? = status == "active"

  def purge_after
    deleted_at && deleted_at + PURGE_AFTER
  end
end
