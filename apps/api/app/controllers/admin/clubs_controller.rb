module Admin
  # A05 clubs (docs/specs/admin.md R-18; clubs R-23). A new club gets the
  # app account as owner unless another handle is given, so a seeded club
  # always has the one owner the model requires (clubs R-3).
  class ClubsController < BaseController
    include Admin::VisibilityActions

    PER_PAGE = 50

    before_action :load_record, only: %i[show edit update] + Admin::VisibilityActions::ACTIONS

    def index
      @query = params[:q].to_s.strip
      @pagy, @clubs = pagy(scoped_clubs, limit: PER_PAGE)
    end

    def show
      load_show
    end

    def new
      @club = Club.new(join_policy: "open", status: "active")
    end

    def edit; end

    def create
      @club = Club.new(created_by: current_admin)
      assign(@club)
      owner = Admin::HandleLookup.call(params[:owner_handle]) || User.app_account
      return render_new_without_owner if owner.nil?

      if save_with_owner(@club, owner)
        audit("create", target: @club, changes: changeset(@club).merge("owner_handle" => owner.profile&.handle))
        redirect_to admin_club_path(@club), notice: "Club created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@club)
      if @club.save
        audit("update", target: @club, changes: changeset(@club))
        redirect_to admin_club_path(@club), notice: "Club saved."
      else
        render :edit, status: :unprocessable_content
      end
    end

    private

    def load_record
      @club = @record = Club.find(params[:id])
    end

    def record_path(club) = admin_club_path(club)

    def load_show
      @memberships = @club.memberships.includes(user: :profile).order(:role, :created_at)
      @events = @club.events.order(:title).limit(20)
    end

    def scoped_clubs
      scope = Club.order(:name, :id)
      return scope if @query.blank?

      scope.where("clubs.name ILIKE :q OR clubs.slug ILIKE :q", q: "%#{Club.sanitize_sql_like(@query)}%")
    end

    # The owner membership and the club are one write: a club that exists
    # without its owner would fail every later save (clubs R-3).
    def save_with_owner(club, owner)
      Club.transaction do
        club.save!
        club.memberships.create!(user: owner, role: "owner", status: "active")
      end
      true
    rescue ActiveRecord::RecordInvalid => error
      # A membership failure would otherwise render an empty error list.
      club.errors.merge!(error.record.errors) unless error.record == club
      false
    end

    def render_new_without_owner
      @club.errors.add(:base, "No owner. Give a handle, or seed the app account first.")
      render :new, status: :unprocessable_content
    end

    # links only when the form sent them: a PATCH that leaves the key out
    # is not a request to clear all six.
    def assign(club)
      attributes = club_params
      club.assign_attributes(attributes.except(:home_lat, :home_lng, :links))
      club.links = attributes[:links].to_h if attributes.key?(:links)
      point = Geo::Coordinates.point(attributes[:home_lat], attributes[:home_lng])
      club.home_location = point if point
    end

    def club_params
      params.require(:club).permit(:name, :slug, :description, :home_label, :home_lat, :home_lng,
                                   :join_policy, :status, :verified, :avatar, :banner,
                                   links: SocialLinks::LINK_KEYS)
    end

    def changeset(club)
      club.saved_changes.except("created_at", "updated_at")
          .transform_values { |before, after| { "before" => before.to_s, "after" => after.to_s } }
    end
  end
end
