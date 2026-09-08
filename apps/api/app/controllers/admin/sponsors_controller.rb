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
      if persist(@sponsor)
        audit("create", target: @sponsor, changes: changeset(@sponsor))
        redirect_to admin_sponsor_path(@sponsor), notice: "Sponsor created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@sponsor)
      if persist(@sponsor)
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

    # The problems come back rather than going onto the record, because
    # `save` clears the errors collection before validating.
    def assign(sponsor)
      @problems = Admin::RecordFields.apply(sponsor, sponsor_params)
    end

    # False when a form field could not be shaped at all, so the record is
    # never saved half-changed.
    def persist(sponsor)
      return sponsor.save if @problems.blank?

      sponsor.validate
      @problems.each { |problem| sponsor.errors.add(problem.attribute, problem.message) }
      false
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
