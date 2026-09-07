# A meet (docs/data-model.md events; events spec R-1 to R-5, R-9). The host
# is polymorphic over User, Club, and Sponsor with no database FK (ADR 0010):
# existence is checked here per type and drift is reported nightly by
# HostConsistencyJob (1.5). host_name is denormalized on every save and
# rewritten when the host renames (Profile, Club, Sponsor callbacks).
class Event < ApplicationRecord
  HOST_TYPES = %w[User Club Sponsor].freeze
  CADENCES = %w[once weekly monthly seasonal announced].freeze
  STATUSES = %w[draft published cancelled].freeze
  VISIBILITIES = %w[public unlisted].freeze
  RSVP_MODES = %w[open count_only off].freeze
  TAGS = %w[jdm euro exotic classic muscle truck ev bike all].freeze
  MAX_SPONSORSHIPS = 6
  DURATION_RANGE = 15..720
  SLUG_FORMAT = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
  SLUG_LENGTH = 3..60
  SLUG_SUFFIX_ALPHABET = [ *"a".."z", *"0".."9" ].freeze
  SLUG_SUFFIX_LENGTH = 6
  # R-25: unclaimed and not confirmed (or published) within this long.
  STALE_AFTER = 30.days
  # R-14: read-time re-materialization when the horizon is shorter than this.
  MATERIALIZE_ON_READ_WITHIN = 60.days
  # A change to any of these on a published event re-materializes it.
  SCHEDULE_ATTRIBUTES = %w[cadence dtstart duration_minutes timezone rrule rrule_until venue_id status dormant_at].freeze

  belongs_to :host, polymorphic: true, optional: true
  belongs_to :created_by, class_name: "User"
  belongs_to :venue
  has_many :occurrences, class_name: "EventOccurrence", dependent: :destroy
  has_many :sponsorships, -> { order(:position, :created_at) }, class_name: "EventSponsorship",
           dependent: :destroy, inverse_of: :event
  has_many :sponsors, through: :sponsorships
  has_many :claim_requests, dependent: :destroy
  has_one_attached :cover

  # Registered before the dependent destroys so the attached sponsors can be
  # recounted once their rows are gone.
  before_destroy :remember_sponsor_ids, prepend: true
  before_validation :generate_slug, on: :create
  before_validation :copy_timezone_from_venue, on: :create
  before_validation :truncate_dtstart
  before_validation :write_host_name
  before_validation :normalize_source_url
  before_save :stamp_published_at
  after_save :recount_hosts_after_save,
             if: -> { saved_change_to_status? || saved_change_to_host_type? || saved_change_to_host_id? }
  after_destroy :recount_hosts_after_destroy
  after_commit :enqueue_materializer, on: [ :create, :update ], if: :materialize_after_commit?

  validates :host_type, inclusion: { in: HOST_TYPES }
  validates :host_id, presence: true
  validate :host_must_exist
  validates :host_name, presence: true
  validates :title, presence: true, length: { maximum: 120 }
  validates :slug, presence: true, format: { with: SLUG_FORMAT }, length: { in: SLUG_LENGTH }, uniqueness: true
  validate :slug_frozen_after_publish
  validates :description, length: { maximum: 5_000 }, allow_nil: true
  validates :cadence, inclusion: { in: CADENCES }
  validates :duration_minutes, numericality: { only_integer: true, in: DURATION_RANGE }
  validates :timezone, presence: true
  validate :timezone_is_iana
  validates :rrule, "recurrence/rrule": true
  validate :cadence_rules
  validates :parking_note, length: { maximum: 200 }, allow_nil: true
  validate :tags_allowed
  validates :status, inclusion: { in: STATUSES }
  validates :visibility, inclusion: { in: VISIBILITIES }
  validates :source_url, uniqueness: true, allow_nil: true
  validates :capacity, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :rsvp_mode, inclusion: { in: RSVP_MODES }

  scope :published, -> { where(status: "published") }
  # What public lists, the map, feed, and search may show (R-16, R-27, and
  # hidden_at from docs/data-model.md).
  scope :listed, -> { published.where(visibility: "public", hidden_at: nil, dormant_at: nil) }
  scope :hosted_by, ->(host) { where(host_type: host.class.name, host_id: host.id) }
  # Events the materializer expands (R-11): published, not dormant, with a
  # schedule (announced events get rows only from the host or an admin).
  scope :materializable, -> { published.where(dormant_at: nil).where.not(cadence: "announced") }
  # Carries the R-25 flag on the row so a detail read computes it in SQL too.
  scope :with_stale, -> { select("events.*", "#{stale_sql} AS stale_flag") }

  # R-25 as SQL, defined once, so every list computes stale in the query.
  # Takes the clock so specs under travel_to and the query agree. Never
  # NULL: created_at backstops a row written past the callbacks (the seed
  # importer upserts), and a NULL here would drop the row from the keyset
  # comparison that pages the list.
  def self.stale_sql(now = Time.current)
    sanitize_sql_array([
      "COALESCE(events.claimed_at IS NULL AND COALESCE(events.last_confirmed_at, events.published_at, events.created_at) < ?, FALSE)",
      now - STALE_AFTER
    ])
  end

  def published? = status == "published"
  def draft? = status == "draft"
  def recurring? = cadence != "once"
  def dormant? = dormant_at.present?
  def claimed? = claimed_at.present?
  def materializable? = published? && !dormant? && cadence != "announced"
  def listed? = published? && visibility == "public" && hidden_at.nil? && dormant_at.nil?
  def unlisted? = visibility == "unlisted"
  def cancelled? = status == "cancelled"
  def hidden? = hidden_at.present?
  def gone? = cancelled? || hidden?

  # R-25, always from SQL: the selected column when the row came from
  # with_stale, otherwise one small query.
  def stale?
    return self[:stale_flag] if has_attribute?(:stale_flag)

    self.class.where(id: id).pick(Arel.sql(self.class.stale_sql)) || false
  end

  # R-14: a recurring event whose materialized horizon has run short
  # re-materializes on read, so a missed nightly run self-heals.
  def horizon_short?
    return false unless materializable? && recurring?

    latest = occurrences.scheduled.maximum(:starts_at)
    latest.nil? || latest < MATERIALIZE_ON_READ_WITHIN.from_now
  end

  # R-15: "Every Saturday", "First Sunday of the month", ...; nil for once.
  def rrule_text
    Recurrence::Describer.call(self)
  end

  # R-9: scheduled occurrences only. Bulk writers (the materializer's
  # upsert) call this after they finish since upsert_all skips callbacks.
  def recount_occurrences!
    return if destroyed?

    update_columns(occurrences_count: occurrences.scheduled.count)
  end

  # The name shown for the host today; nil when the host row is missing.
  def host_display_name
    return nil unless HOST_TYPES.include?(host_type)

    case host
    when User then host.profile&.display_name
    when Club, Sponsor then host.name
    end
  end

  private

  def generate_slug
    return if slug.present? || title.blank?

    base = title.parameterize.first(SLUG_LENGTH.max - SLUG_SUFFIX_LENGTH - 1).sub(/-\z/, "")
    base = "event" if base.blank?
    self.slug = "#{base}-#{Array.new(SLUG_SUFFIX_LENGTH) { SLUG_SUFFIX_ALPHABET.sample(random: SecureRandom) }.join}"
  end

  # "Copied from venue at create; editable" (docs/data-model.md): an
  # explicit value wins, otherwise the venue's zone replaces the column default.
  def copy_timezone_from_venue
    self.timezone = venue.timezone if venue && (timezone.blank? || !timezone_changed?)
  end

  def write_host_name
    name = host_display_name
    self.host_name = name if name.present?
  end

  # The partial unique index and the uniqueness validation treat "" as a
  # value, so a blank source is stored as null.
  def normalize_source_url
    self.source_url = nil if source_url.blank?
  end

  def stamp_published_at
    self.published_at ||= Time.current if published?
  end

  def host_must_exist
    return if host_id.blank? || !HOST_TYPES.include?(host_type)

    errors.add(:host, "must exist") unless host_type.constantize.exists?(host_id)
  end

  # R-5: the slug is part of a shared URL once the event is public.
  def slug_frozen_after_publish
    return unless persisted? && will_save_change_to_slug? && attribute_in_database(:published_at).present?

    errors.add(:slug, "cannot change after publish")
  end

  def timezone_is_iana
    return if timezone.blank?

    errors.add(:timezone, "must be an IANA zone name") unless Geo.iana_timezone?(timezone)
  end

  # R-3. A cadence that needs a rule reports the same bad-rrule message as
  # the grammar check (AC-11), once.
  def cadence_rules
    case cadence
    when "once", "announced"
      errors.add(:rrule, "must be blank for once and announced") if rrule.present?
    when "weekly" then require_rrule("WEEKLY")
    when "monthly" then require_rrule("MONTHLY")
    when "seasonal"
      require_rrule
      errors.add(:rrule_until, "is required for seasonal") if rrule_until.blank?
    end
    errors.add(:dtstart, "is required unless cadence is announced") if dtstart.blank? && cadence != "announced"
  end

  def require_rrule(freq = nil)
    rule = Recurrence::RruleValidator.parse(rrule)
    return if rule && (freq.nil? || rule.freq == freq)
    return if errors.of_kind?(:rrule, :invalid_rrule)

    errors.add(:rrule, :invalid_rrule, message: Recurrence::RruleValidator::MESSAGE)
  end

  def tags_allowed
    return if tags.blank?

    unknown = tags - TAGS
    errors.add(:tags, "contains unknown tags: #{unknown.join(', ')}") if unknown.any?
    errors.add(:tags, "contains duplicates") if tags.uniq.size != tags.size
  end

  def remember_sponsor_ids
    @sponsor_ids_before_destroy = sponsor_ids
  end

  # Occurrence starts are whole seconds (the materializer truncates ice_cube
  # times), so dtstart is stored the same way and lookups by starts_at agree.
  def truncate_dtstart
    self.dtstart = dtstart.change(usec: 0) if dtstart && dtstart.usec.nonzero?
  end

  # R-10: after create or a schedule change of a published event. A draft
  # that is published later fires then, since status is a schedule attribute.
  def materialize_after_commit?
    materializable? && (previously_new_record? || schedule_changed?)
  end

  def schedule_changed?
    (saved_changes.keys & SCHEDULE_ATTRIBUTES).any?
  end

  def enqueue_materializer
    MaterializeOccurrencesJob.perform_later(id)
  end

  # clubs.events_count and sponsors.events_count count published events by
  # host; a sponsor also counts published events it is attached to (R-4).
  def recount_hosts_after_save
    recount_host(host_type, host_id)
    if saved_change_to_host_type? || saved_change_to_host_id?
      recount_host(host_type_before_last_save, host_id_before_last_save)
    end
    sponsors.find_each(&:recount_events!) if saved_change_to_status?
  end

  def recount_hosts_after_destroy
    recount_host(host_type, host_id)
    Sponsor.where(id: @sponsor_ids_before_destroy).find_each(&:recount_events!)
  end

  def recount_host(type, id)
    case type
    when "Club" then Club.find_by(id: id)&.recount_events!
    when "Sponsor" then Sponsor.find_by(id: id)&.recount_events!
    end
  end
end

# == Schema Information
#
# Table name: events
#
#  id                            :uuid             not null, primary key
#  cadence                       :text             default("once"), not null
#  capacity                      :integer
#  claimed_at                    :timestamptz
#  comments_count                :integer          default(0), not null
#  description                   :text
#  dormant_at                    :timestamptz
#  dtstart                       :timestamptz
#  duration_minutes              :integer          not null
#  external_host_name            :text
#  followers_count               :integer          default(0), not null
#  hidden_at                     :timestamptz
#  host_name                     :text             not null
#  host_type                     :text             not null
#  last_confirmed_at             :timestamptz
#  occurrences_count             :integer          default(0), not null
#  parking_note                  :text
#  published_at                  :timestamptz
#  rrule                         :text
#  rrule_until                   :timestamptz
#  rsvp_mode                     :text             default("open"), not null
#  slug                          :text             not null
#  source_type                   :text
#  source_url                    :text
#  status                        :text             default("draft"), not null
#  tags                          :text             default([]), not null, is an Array
#  timezone                      :text             default("America/Los_Angeles"), not null
#  title                         :text             not null
#  venue_permission_confirmed_at :timestamptz
#  verification_source_url       :text
#  verified_at                   :timestamptz
#  visibility                    :text             default("public"), not null
#  created_at                    :datetime         not null
#  updated_at                    :datetime         not null
#  created_by_id                 :uuid             not null
#  host_id                       :uuid             not null
#  import_id                     :uuid
#  venue_id                      :uuid             not null
#
# Indexes
#
#  index_events_on_claimed_at_and_last_confirmed_at  (claimed_at,last_confirmed_at)
#  index_events_on_created_by_id                     (created_by_id)
#  index_events_on_dormant_at                        (dormant_at) WHERE (dormant_at IS NOT NULL)
#  index_events_on_host_name                         (host_name) USING gin
#  index_events_on_host_type_and_host_id_and_status  (host_type,host_id,status)
#  index_events_on_import_id                         (import_id)
#  index_events_on_slug                              (slug) UNIQUE
#  index_events_on_source_url                        (source_url) UNIQUE WHERE (source_url IS NOT NULL)
#  index_events_on_tags                              (tags) USING gin
#  index_events_on_title                             (title) USING gin
#  index_events_on_venue_id                          (venue_id)
#
# Foreign Keys
#
#  fk_rails_...  (created_by_id => users.id)
#  fk_rails_...  (venue_id => venues.id)
#
