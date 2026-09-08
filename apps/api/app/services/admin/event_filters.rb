module Admin
  # A04's list filters (docs/specs/admin.md R-15). Every filter is optional
  # and an unknown value is ignored rather than raising, so a hand-edited
  # query string cannot 500 the list.
  class EventFilters
    CLAIMED = %w[yes no].freeze
    FLAGS = %w[1 true on].freeze

    attr_reader :status, :host_type, :claimed, :q

    def initialize(params)
      @status = params[:status].presence_in(Event::STATUSES)
      @host_type = params[:host_type].presence_in(Event::HOST_TYPES)
      @claimed = params[:claimed].presence_in(CLAIMED)
      @stale = FLAGS.include?(params[:stale].to_s)
      @dormant = FLAGS.include?(params[:dormant].to_s)
      @q = params[:q].to_s.strip
    end

    def stale? = @stale
    def dormant? = @dormant

    def apply(scope)
      scope = scope.where(status: status) if status
      scope = scope.where(host_type: host_type) if host_type
      scope = claimed == "yes" ? scope.where.not(claimed_at: nil) : scope.unclaimed if claimed
      scope = scope.stale if stale?
      scope = dormant? ? scope.where.not(dormant_at: nil) : scope
      return scope if q.blank?

      like = "%#{Event.sanitize_sql_like(q)}%"
      scope.where("events.title ILIKE :q OR events.host_name ILIKE :q OR events.slug ILIKE :q", q: like)
    end

    # The filter values as a query string hash, for the pager and for links
    # back to a filtered list.
    def to_params
      { status: status, host_type: host_type, claimed: claimed,
        stale: ("1" if stale?), dormant: ("1" if dormant?), q: q.presence }.compact
    end
  end
end
