module Geo
  # The filters shared by GET /events and GET /events/map (events spec
  # R-18, R-19; discovery R-7, R-9), applied to a relation that joins
  # `events` and `venues` under their table names.
  class EventFilters
    HOST_TYPES = { "user" => "User", "club" => "Club", "sponsor" => "Sponsor" }.freeze
    MAX_QUERY_LENGTH = 100

    attr_reader :tags, :recurring, :q, :host_type, :host_id, :sponsor_id

    def self.from_params(params, geo_only: false)
      new(
        tags: parse_tags(params[:tags]),
        recurring: params[:recurring].to_s == "true",
        q: geo_only ? nil : parse_query(params[:q]),
        host: geo_only ? nil : parse_host(params[:host]),
        sponsor_id: geo_only ? nil : parse_uuid(params[:sponsor], "sponsor")
      )
    end

    def self.parse_tags(value)
      tags = Array(value).map(&:to_s).reject(&:blank?).uniq
      unknown = tags - Event::TAGS
      raise ParamError, "tags must be from: #{Event::TAGS.join(', ')}." if unknown.any?

      tags
    end

    def self.parse_query(value)
      text = value.to_s.strip
      return nil if text.blank?
      raise ParamError, "q can be at most #{MAX_QUERY_LENGTH} characters." if text.length > MAX_QUERY_LENGTH

      text
    end

    def self.parse_host(value)
      return nil if value.blank?

      type, id = value.to_s.split(":", 2)
      host_type = HOST_TYPES[type.to_s.downcase]
      raise ParamError, "host must be <type>:<id> with type user, club, or sponsor." if host_type.nil? || !id.to_s.match?(Device::UUID)

      [ host_type, id.downcase ]
    end

    def self.parse_uuid(value, name)
      return nil if value.blank?
      raise ParamError, "#{name} must be a UUID." unless value.to_s.match?(Device::UUID)

      value.to_s.downcase
    end

    def initialize(tags: [], recurring: false, q: nil, host: nil, sponsor_id: nil)
      @tags = tags
      @recurring = recurring
      @q = q
      @host_type, @host_id = host
      @sponsor_id = sponsor_id
    end

    def any_direct?
      q.present? || host_type.present? || sponsor_id.present?
    end

    def apply(relation)
      relation = relation.where("events.tags && ARRAY[?]::text[]", tags) if tags.any?
      relation = relation.where.not(events: { cadence: "once" }) if recurring
      relation = relation.where(events: { host_type: host_type, host_id: host_id }) if host_type
      relation = relation.where(sponsor_sql, id: sponsor_id) if sponsor_id
      relation = relation.where(search_sql, q: q, like: "%#{Event.sanitize_sql_like(q)}%") if q
      relation
    end

    private

    # Events the sponsor hosts or is attached to (docs/api.md Events).
    def sponsor_sql
      "((events.host_type = 'Sponsor' AND events.host_id = :id) OR events.id IN (SELECT event_id FROM event_sponsorships WHERE sponsor_id = :id))"
    end

    # R-19: trigram similarity (the % operator at pg_trgm's default 0.3
    # threshold, served by the GIN indexes) on title and host_name, ILIKE on
    # the venue name.
    def search_sql
      "(events.title % :q OR events.host_name % :q OR venues.name ILIKE :like)"
    end
  end
end
