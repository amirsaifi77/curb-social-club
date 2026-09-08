module Admin
  # A04 events (docs/specs/admin.md R-15, R-16). Schedule edits go through
  # the model, so host_name stays in sync and the materializer is enqueued
  # exactly once (events R-2, R-10). Host fields on a claimed event and the
  # slug on a published one are dropped from the params rather than only
  # disabled in the form, and the drop is audited (AC-10).
  class EventsController < BaseController
    PER_PAGE = 50
    LOCKED_AUDIT = "skipped_locked_fields".freeze
    CLAIMED_COPY = "Claimed by %<host_name>s on %<date>s. Host fields are locked; " \
                   "change ownership through a claim.".freeze

    before_action :load_event, only: %i[edit update verify confirm rematerialize]

    def index
      @filters = Admin::EventFilters.new(params)
      scope = @filters.apply(Event.all)
      # The count comes from the plain relation: with_stale selects a raw
      # expression that COUNT cannot wrap.
      @pagy, @events = pagy(scope.with_stale.includes(:venue).order(created_at: :desc),
                            count: scope.count, limit: PER_PAGE)
      @next_dates = EventOccurrence.scheduled.upcoming.where(event_id: @events.map(&:id))
                                   .group(:event_id).minimum(:starts_at)
    end

    def new
      @event = Event.new(cadence: "once", duration_minutes: 120, status: "draft",
                         host_type: "User", host_id: User.app_account&.id)
    end

    def edit; end

    def create
      @event = Event.new(created_by: current_admin)
      assign(@event)
      changes = changeset(@event)
      if @event.save
        audit("create", target: @event, changes: changes)
        redirect_to edit_admin_event_path(@event), notice: "Event created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@event)
      changes = changeset(@event)
      if @event.save
        audit("update", target: @event, changes: changes)
        redirect_to edit_admin_event_path(@event), notice: "Event saved."
      else
        render :edit, status: :unprocessable_content
      end
    end

    # R-16, R-2, R-28: verified and confirmed as of now, and out of dormancy.
    # Clearing dormant_at is a schedule change, so the Event callback enqueues
    # the materializer once.
    def verify
      now = Time.current
      @event.update!(verified_at: now, last_confirmed_at: now, dormant_at: nil)
      audit("verify", target: @event, changes: { "verified_at" => now.iso8601, "last_confirmed_at" => now.iso8601 })
      redirect_to edit_admin_event_path(@event), notice: "Marked verified and confirmed."
    end

    def confirm
      now = Time.current
      @event.update!(last_confirmed_at: now)
      audit("confirm", target: @event, changes: { "last_confirmed_at" => now.iso8601 })
      redirect_to edit_admin_event_path(@event), notice: "Confirmed."
    end

    def rematerialize
      MaterializeOccurrencesJob.perform_later(@event.id)
      audit("rematerialize", target: @event)
      redirect_to admin_event_occurrences_path(@event), notice: "Rebuilding occurrences."
    end

    private

    def load_event
      @event = Event.find(params[:id])
    end

    def assign(event)
      attributes = event_params
      skipped = skipped_keys(event, attributes)
      attributes = attributes.except(*skipped)
      audit(LOCKED_AUDIT, target: event, changes: { "skipped" => skipped.map(&:to_s) }) if skipped.any?

      host = Admin::HostPicker.parse(attributes.delete(:host))
      # The checkbox group carries a blank so clearing every tag submits the
      # key; an empty string is not a tag.
      attributes[:tags] = attributes[:tags].compact_blank if attributes.key?(:tags)
      event.assign_attributes(attributes)
      event.host_type, event.host_id = host if host
      zone = effective_zone(event, attributes)
      event.dtstart = parse_local(params.dig(:event, :dtstart_local), zone) if params[:event]&.key?(:dtstart_local)
      event.rrule_until = parse_local(params.dig(:event, :rrule_until_local), zone) if params[:event]&.key?(:rrule_until_local)
      clear_dormancy(event)
    end

    # On create the model copies the venue's zone unless the timezone was
    # explicitly changed from the column default (events R-6), so the two
    # local times are read in the zone the event ends up with, not the one
    # the form happened to show.
    def effective_zone(event, attributes)
      return event.timezone if event.persisted?

      submitted = attributes[:timezone].presence
      return submitted if submitted && submitted != Event.column_defaults["timezone"]

      Venue.where(id: attributes[:venue_id]).pick(:timezone) || submitted || Venue::DEFAULT_TIMEZONE
    end

    # A claimed event's host is settled by the claim, and a published slug is
    # part of a shared URL (R-15, events R-5). The form disables both, so a
    # value that arrives anyway was crafted; one that matches what is already
    # stored is a harmless round trip and is not worth an audit row.
    def skipped_keys(event, attributes)
      locked_values(event).filter_map do |key, current|
        key if attributes.key?(key) && attributes[key].to_s != current.to_s
      end
    end

    def locked_values(event)
      values = {}
      values[:host] = Admin::HostPicker.value(event.host_type, event.host_id) if event.claimed?
      values[:slug] = event.slug if event.published_at.present?
      values
    end

    # R-2, R-28: a schedule edit is a statement that the meet is still real,
    # so it comes out of dormancy in the same save and the Event callback
    # enqueues the materializer exactly once.
    def clear_dormancy(event)
      watched = Event::SCHEDULE_ATTRIBUTES - [ "dormant_at" ]
      event.dormant_at = nil if event.dormant_at.present? && (event.changed & watched).any?
    end

    # A datetime-local value is wall clock in the event's own zone.
    def parse_local(value, zone)
      return nil if value.blank?

      ActiveSupport::TimeZone[zone.presence || Venue::DEFAULT_TIMEZONE]&.parse(value.to_s)
    end

    # permit rather than expect: fields_for sends nested rows as a hash of
    # hashes, which expect's array shape rejects.
    def event_params
      params.require(:event).permit(
        :title, :slug, :description, :host, :venue_id, :cadence, :duration_minutes, :timezone, :rrule,
        :status, :visibility, :source_url, :source_type, :external_host_name, :parking_note,
        :capacity, :rsvp_mode, :verification_source_url, :cover,
        tags: [], sponsorships_attributes: %i[id sponsor_id role note position _destroy]
      )
    end

    def changeset(event)
      event.changes.transform_values { |before, after| { "before" => before.to_s, "after" => after.to_s } }
    end

    helper_method :claimed_copy

    def claimed_copy(event)
      format(CLAIMED_COPY, host_name: event.host_name, date: event.claimed_at.in_time_zone(AdminHelper::ADMIN_ZONE).strftime("%b %-d, %Y"))
    end
  end
end
