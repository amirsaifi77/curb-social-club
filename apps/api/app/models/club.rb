# A group that organizes meets (docs/data-model.md clubs; clubs spec R-1 to
# R-5). Managed in the admin UI at launch; membership flows arrive in
# Phase 7 behind the clubs_self_service flag. A hidden club stays the host
# of its events (its events keep rendering with host.type club).
class Club < ApplicationRecord
  include SocialLinks

  SLUG_FORMAT = /\A[a-z0-9-]{3,40}\z/
  JOIN_POLICIES = %w[open invite_only].freeze
  STATUSES = %w[active hidden].freeze

  belongs_to :created_by, class_name: "User"
  # Declared first so the restrict check aborts before memberships go.
  has_many :events, as: :host, dependent: :restrict_with_error
  has_many :memberships, class_name: "ClubMembership", dependent: :destroy, inverse_of: :club
  has_many :active_memberships, -> { active }, class_name: "ClubMembership", inverse_of: :club
  has_many :members, through: :active_memberships, source: :user
  has_one :owner_membership, -> { where(role: "owner") }, class_name: "ClubMembership", inverse_of: :club
  has_one :owner, through: :owner_membership, source: :user
  has_one_attached :avatar
  has_one_attached :banner

  before_validation :generate_slug, on: :create

  validates :name, presence: true, length: { maximum: 80 }
  validates :slug, presence: true,
                   format: { with: SLUG_FORMAT, message: "must be 3 to 40 lowercase letters, digits, or hyphens" },
                   uniqueness: { case_sensitive: false }
  validates :description, length: { maximum: 1000 }, allow_nil: true
  validates :home_label, length: { maximum: 80 }, allow_nil: true
  validates :join_policy, inclusion: { in: JOIN_POLICIES }
  validates :status, inclusion: { in: STATUSES }
  validates :invite_code, uniqueness: true, allow_nil: true

  # R-2: every hosted event carries the new name.
  after_update :rewrite_host_names, if: :saved_change_to_name?

  scope :visible, -> { where(status: "active") }

  def hidden? = status == "hidden"

  def recount_members!
    update_columns(members_count: memberships.active.count)
  end

  def recount_events!
    update_columns(events_count: events.published.count)
  end

  private

  def generate_slug
    self.slug = name.to_s.parameterize.first(40).sub(/-+\z/, "") if slug.blank?
  end

  def rewrite_host_names
    events.update_all(host_name: name, updated_at: Time.current)
  end
end

# == Schema Information
#
# Table name: clubs
#
#  id              :uuid             not null, primary key
#  description     :text
#  events_count    :integer          default(0), not null
#  followers_count :integer          default(0), not null
#  home_label      :text
#  home_location   :geography        point, 4326
#  invite_code     :text
#  join_policy     :text             default("open"), not null
#  links           :jsonb            not null
#  members_count   :integer          default(0), not null
#  name            :text             not null
#  slug            :citext           not null
#  status          :text             default("active"), not null
#  verified        :boolean          default(FALSE), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  created_by_id   :uuid             not null
#
# Indexes
#
#  index_clubs_on_created_by_id  (created_by_id)
#  index_clubs_on_home_location  (home_location) USING gist
#  index_clubs_on_invite_code    (invite_code) UNIQUE WHERE (invite_code IS NOT NULL)
#  index_clubs_on_name           (name) USING gin
#  index_clubs_on_slug           (slug) UNIQUE
#  index_clubs_on_status         (status)
#
# Foreign Keys
#
#  fk_rails_...  (created_by_id => users.id)
#
