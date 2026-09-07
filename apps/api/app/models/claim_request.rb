# A request to become the host of a seeded event (docs/data-model.md
# claim_requests). Validations only in Phase 1; submission, review, and the
# approval transaction that sets events.host_* and claimed_at are Phase 2.
class ClaimRequest < ApplicationRecord
  CLAIM_AS_TYPES = %w[User Club].freeze
  STATUSES = %w[pending approved rejected].freeze
  URL_FORMAT = %r{\Ahttps?://[^\s]+\z}

  belongs_to :user
  belongs_to :event
  belongs_to :claim_as, polymorphic: true, optional: true
  belongs_to :reviewed_by, class_name: "User", optional: true

  validates :claim_as_type, inclusion: { in: CLAIM_AS_TYPES }
  validates :claim_as_id, presence: true
  validate :claim_as_belongs_to_claimant
  validates :relationship, presence: true, length: { maximum: 500 }
  validates :evidence_url, format: { with: URL_FORMAT, message: "must start with http:// or https://" }, allow_blank: true
  validates :venue_permission_confirmed, inclusion: { in: [ true ], message: "must be confirmed" }
  validates :status, inclusion: { in: STATUSES }
  validates :event_id, uniqueness: { scope: :user_id, conditions: -> { where(status: "pending") },
                                     message: "already has a pending claim from this user" },
                       if: :pending?
  validates :review_note, length: { maximum: 1000 }, allow_nil: true

  scope :pending, -> { where(status: "pending") }

  def pending? = status == "pending"

  private

  # A user claims as themself or as a club they own or administer.
  def claim_as_belongs_to_claimant
    return if claim_as_id.blank? || user_id.blank? || !CLAIM_AS_TYPES.include?(claim_as_type)

    case claim_as_type
    when "User"
      errors.add(:claim_as, "must be the claimant") unless claim_as_id == user_id
    when "Club"
      manages = ClubMembership.active.managers.exists?(club_id: claim_as_id, user_id: user_id)
      errors.add(:claim_as, "must be a club the claimant owns or administers") unless manages
    end
  end
end

# == Schema Information
#
# Table name: claim_requests
#
#  id                         :uuid             not null, primary key
#  claim_as_type              :text             not null
#  evidence_url               :text
#  relationship               :text             not null
#  review_note                :text
#  reviewed_at                :timestamptz
#  status                     :text             default("pending"), not null
#  venue_permission_confirmed :boolean          default(FALSE), not null
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  claim_as_id                :uuid             not null
#  event_id                   :uuid             not null
#  reviewed_by_id             :uuid
#  user_id                    :uuid             not null
#
# Indexes
#
#  index_claim_requests_on_claim_as_type_and_claim_as_id  (claim_as_type,claim_as_id)
#  index_claim_requests_on_event_id                       (event_id)
#  index_claim_requests_on_reviewed_by_id                 (reviewed_by_id)
#  index_claim_requests_on_user_id                        (user_id)
#  index_claim_requests_on_user_id_and_event_id           (user_id,event_id) UNIQUE WHERE (status = 'pending'::text)
#
# Foreign Keys
#
#  fk_rails_...  (event_id => events.id)
#  fk_rails_...  (reviewed_by_id => users.id)
#  fk_rails_...  (user_id => users.id)
#
