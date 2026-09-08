module Admin
  # A06 sponsors (docs/specs/admin.md R-19; sponsors R-20). Same shape as
  # A05 minus memberships, plus the hosted and sponsored event lists.
  class SponsorsController < BaseController
    include Admin::VisibilityActions

    PER_PAGE = 50
    EVENTS_LIMIT = 20

    before_action :load_record, only: %i[show edit update] + Admin::VisibilityActions::ACTIONS

    def index
      @query = params[:q].to_s.strip
      @pagy, @sponsors = pagy(scoped_sponsors, limit: PER_PAGE)
    end

    def show
      load_show
    end

    def new
      @sponsor = Sponsor.new(kind: "brand", status: "active")
    end

    def edit; end

    def create
      @sponsor = Sponsor.new
      assign(@sponsor)
      if @sponsor.save
        audit("create", target: @sponsor, changes: changeset(@sponsor))
        redirect_to admin_sponsor_path(@sponsor), notice: "Sponsor created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@sponsor)
      if @sponsor.save
        audit("update", target: @sponsor, changes: changeset(@sponsor))
        redirect_to admin_sponsor_path(@sponsor), notice: "Sponsor saved."
      else
        render :edit, status: :unprocessable_content
      end
    end

    private

    def load_record
      @sponsor = @record = Sponsor.find(params[:id])
    end

    def record_path(sponsor) = admin_sponsor_path(sponsor)

    # R-19: hosted and sponsored, kept apart because they mean different
    # things to whoever is checking a sponsor's page.
    def load_show
      @hosted = @sponsor.events.order(:title).limit(EVENTS_LIMIT)
      @sponsored = @sponsor.sponsored_events.order(:title).limit(EVENTS_LIMIT)
    end

    def scoped_sponsors
      scope = Sponsor.order(:name, :id)
      return scope if @query.blank?

      scope.where("sponsors.name ILIKE :q OR sponsors.slug ILIKE :q", q: "%#{Sponsor.sanitize_sql_like(@query)}%")
    end

    # links only when the form sent them: a PATCH that leaves the key out
    # is not a request to clear all six.
    def assign(sponsor)
      attributes = sponsor_params
      sponsor.assign_attributes(attributes.except(:home_lat, :home_lng, :links))
      sponsor.links = attributes[:links].to_h if attributes.key?(:links)
      point = Geo::Coordinates.point(attributes[:home_lat], attributes[:home_lng])
      sponsor.home_location = point if point
    end

    def sponsor_params
      params.require(:sponsor).permit(:name, :slug, :kind, :tagline, :description, :website,
                                      :home_label, :home_lat, :home_lng, :status, :verified,
                                      :logo, :banner, links: SocialLinks::LINK_KEYS)
    end

    def changeset(sponsor)
      sponsor.saved_changes.except("created_at", "updated_at")
             .transform_values { |before, after| { "before" => before.to_s, "after" => after.to_s } }
    end
  end
end
