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
      owner = resolve_owner
      return render :new, status: :unprocessable_content if owner.nil?

      if @problems.blank? && save_with_owner(@club, owner)
        audit("create", target: @club, changes: changeset(@club).merge("owner_handle" => owner.profile&.handle))
        redirect_to admin_club_path(@club), notice: "Club created."
      else
        render :new, status: :unprocessable_content
      end
    end

    def update
      assign(@club)
      if persist(@club)
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

    # A blank field means the app account on purpose. A handle that does not
    # resolve is a typo, and must not quietly become the app account: the
    # one-owner rule makes a wrong owner unfixable from this screen.
    def resolve_owner
      handle = params[:owner_handle].to_s.strip
      if handle.present?
        owner = Admin::HandleLookup.call(handle)
        @club.errors.add(:base, Admin::HandleLookup::UNKNOWN) if owner.nil?
        return owner
      end

      User.app_account.tap do |app_account|
        @club.errors.add(:base, "No owner. Give a handle, or seed the app account first.") if app_account.nil?
      end
    end

    # The problems come back rather than going onto the record, because
    # `save` clears the errors collection before validating.
    def assign(club)
      @problems = Admin::RecordFields.apply(club, club_params)
    end

    # False when a form field could not be shaped at all, so the record is
    # never saved half-changed.
    def persist(club)
      return club.save if @problems.blank?

      club.validate
      @problems.each { |problem| club.errors.add(problem.attribute, problem.message) }
      false
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
