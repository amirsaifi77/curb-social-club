class User < ApplicationRecord
  ROLES = %w[member moderator admin].freeze
  STATUSES = %w[active suspended deleted].freeze
  PURGE_AFTER = 30.days

  has_many :identities, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :devices, dependent: :nullify
  has_one :profile, dependent: :destroy
  # Hosted and created rows are moved to the app account by the deletion and
  # purge jobs before a user row goes away (auth spec R-15, R-16).
  has_many :hosted_events, class_name: "Event", as: :host
  has_many :created_events, class_name: "Event", foreign_key: :created_by_id, inverse_of: :created_by, dependent: :restrict_with_error
  has_many :created_venues, class_name: "Venue", foreign_key: :created_by_id, inverse_of: :created_by, dependent: :restrict_with_error
  has_many :club_memberships, dependent: :destroy
  has_many :clubs, through: :club_memberships
  has_many :sent_club_invitations, class_name: "ClubMembership", foreign_key: :invited_by_id, inverse_of: :invited_by, dependent: :nullify
  has_many :claim_requests, dependent: :destroy
  has_many :reviewed_claim_requests, class_name: "ClaimRequest", foreign_key: :reviewed_by_id, inverse_of: :reviewed_by, dependent: :nullify

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

# == Schema Information
#
# Table name: users
#
#  id                :uuid             not null, primary key
#  deleted_at        :timestamptz
#  email             :citext
#  last_seen_at      :timestamptz
#  role              :text             default("member"), not null
#  status            :text             default("active"), not null
#  terms_accepted_at :timestamptz
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_users_on_deleted_at  (deleted_at) WHERE (deleted_at IS NOT NULL)
#  index_users_on_email       (email) UNIQUE WHERE (email IS NOT NULL)
#  index_users_on_status      (status)
#
