module Admin
  # A03 venues (docs/specs/admin.md R-14). Plain CRUD with a name and city
  # search; lat and lng are edited as numbers and written to the geography
  # column, which moves the venue's future occurrences with it (events R-8).
  class VenuesController < BaseController
    PER_PAGE = 50
    UPCOMING_LIMIT = 20

    before_action :load_venue, only: %i[show edit update destroy]

    def index
      @query = params[:q].to_s.strip
      @pagy, @venues = pagy(scoped_venues, limit: PER_PAGE)
      @event_counts = Event.where(venue_id: @venues.map(&:id)).group(:venue_id).count
    end

    def show
      load_show
    end

    def new
      @venue = Venue.new(country: "US", timezone: Venue::DEFAULT_TIMEZONE)
    end

    def edit; end

    def create
      @venue = Venue.new(created_by: current_admin)
      assign(@venue)
      if @venue.save
        audit("create", target: @venue, changes: changeset(@venue))
        redirect_to admin_venue_path(@venue), notice: "Venue created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@venue)
      if @venue.save
        audit("update", target: @venue, changes: changeset(@venue))
        redirect_to admin_venue_path(@venue), notice: "Venue saved."
      else
        render :edit, status: :unprocessable_content
      end
    end

    # A venue with events is refused by the model (dependent: :restrict_with_error);
    # the show page lists them so the admin can repoint them first.
    def destroy
      if @venue.destroy
        audit("destroy", target: @venue, changes: { "name" => @venue.name })
        redirect_to admin_venues_path, notice: "Venue deleted."
      else
        load_show
        render :show, status: :unprocessable_content
      end
    end

    private

    def load_venue
      @venue = Venue.find(params[:id])
    end

    def scoped_venues
      scope = Venue.order(:name, :id)
      return scope if @query.blank?

      scope.where("venues.name ILIKE :q OR venues.city ILIKE :q", q: "%#{Venue.sanitize_sql_like(@query)}%")
    end

    # R-14 asks for the upcoming events; the delete guard needs to know
    # about every event, including one whose dates are all in the past, so
    # the two are counted separately.
    def load_show
      @upcoming = upcoming_events(@venue)
      @event_count = Event.where(venue: @venue).count
    end

    # [event, its next scheduled date] in two queries rather than one per row.
    def upcoming_events(venue)
      next_dates = EventOccurrence.scheduled.upcoming.where(event_id: Event.where(venue: venue).select(:id))
                                  .group(:event_id).minimum(:starts_at)
      Event.where(id: next_dates.keys).order(:title).limit(UPCOMING_LIMIT)
           .map { |event| [ event, next_dates[event.id] ] }
    end

    def assign(venue)
      venue.assign_attributes(venue_params.except(:lat, :lng))
      point = Geo::Coordinates.point(venue_params[:lat], venue_params[:lng])
      venue.location = point if point
    end

    def venue_params
      params.expect(venue: %i[name address_line1 address_line2 city region postal_code country
                              timezone external_place_id external_source lat lng])
    end

    # After the save, so R-1's before and after covers the columns the
    # model's own callbacks wrote.
    def changeset(venue)
      venue.saved_changes.except("created_at", "updated_at")
           .transform_values { |before, after| { "before" => before.to_s, "after" => after.to_s } }
    end
  end
end
