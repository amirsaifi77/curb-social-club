# A user's place in a club (docs/data-model.md club_memberships; clubs spec
# R-3, R-4). Exactly one owner per club: a second owner and any change that
# would leave the club without one are rejected here, and a partial unique
# index backs the first rule.
class ClubMembership < ApplicationRecord
  ROLES = %w[owner admin member].freeze
  STATUSES = %w[active invited requested].freeze

  belongs_to :club, inverse_of: :memberships
  belongs_to :user
  belongs_to :invited_by, class_name: "User", optional: true

  before_validation :stamp_joined_at

  validates :role, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :club_id, message: "is already a member" }
  validate :single_owner

  before_destroy :keep_owner
  after_save :recount_club, if: -> { previously_new_record? || saved_change_to_status? }
  after_destroy :recount_club

  scope :active, -> { where(status: "active") }
  scope :managers, -> { where(role: %w[owner admin]) }

  def owner? = role == "owner"
  def manager? = ROLES.first(2).include?(role)

  private

  def stamp_joined_at
    self.joined_at ||= Time.current if status == "active"
  end

  def single_owner
    return if club.nil?

    if owner?
      errors.add(:status, "must be active for the owner") unless status == "active"
      errors.add(:role, "is taken: a club has exactly one owner") if other_owner_exists?
    elsif persisted? && role_in_database == "owner"
      errors.add(:role, "cannot change: a club must keep its owner")
    end
  end

  def other_owner_exists?
    club.memberships.where(role: "owner").where.not(id: id).exists?
  end

  def keep_owner
    return if destroyed_by_association || !owner?

    errors.add(:base, "A club must keep its owner")
    throw :abort
  end

  def recount_club
    return if destroyed_by_association

    club.recount_members!
  end
end

# == Schema Information
#
# Table name: club_memberships
#
#  id            :uuid             not null, primary key
#  joined_at     :timestamptz
#  role          :text             default("member"), not null
#  status        :text             default("active"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  club_id       :uuid             not null
#  invited_by_id :uuid
#  user_id       :uuid             not null
#
# Indexes
#
#  index_club_memberships_on_club_id_and_user_id   (club_id,user_id) UNIQUE
#  index_club_memberships_on_club_id_single_owner  (club_id) UNIQUE WHERE (role = 'owner'::text)
#  index_club_memberships_on_invited_by_id         (invited_by_id)
#  index_club_memberships_on_user_id_and_status    (user_id,status)
#
# Foreign Keys
#
#  fk_rails_...  (club_id => clubs.id)
#  fk_rails_...  (invited_by_id => users.id)
#  fk_rails_...  (user_id => users.id)
#
