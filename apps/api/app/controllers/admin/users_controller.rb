module Admin
  # A08 users (docs/specs/admin.md R-3, R-4, R-9, R-22). A moderator lists,
  # reads, suspends, and unsuspends; only an admin changes a role or
  # deletes, and nobody changes their own role.
  class UsersController < BaseController
    self.moderator_access = true

    PER_PAGE = 50
    EVENTS_LIMIT = 20
    ROLE_LOCKED = "You can't change your own role.".freeze

    before_action :load_user, only: %i[show role suspend unsuspend destroy]
    before_action :require_admin_role!, only: %i[role destroy]
    before_action :require_live_user!, only: %i[role suspend unsuspend destroy]

    def index
      @query = params[:q].to_s.strip
      @pagy, @users = pagy(scoped_users, limit: PER_PAGE)
      @handles = Profile.where(user_id: @users.map(&:id)).pluck(:user_id, :handle).to_h
    end

    def show
      @identities = @user.identities.order(:provider)
      @session_count = @user.sessions.count
      @hosted = Event.where(host_type: "User", host_id: @user.id).order(:title).limit(EVENTS_LIMIT)
    end

    # R-22: never on oneself, whatever the form was made to send.
    def role
      return redirect_to admin_user_path(@user), alert: ROLE_LOCKED if @user.id == current_admin.id

      before = @user.role
      if @user.update(role: role_param)
        audit("role", target: @user, changes: { "role" => { "before" => before, "after" => @user.role } })
        redirect_to admin_user_path(@user), notice: "Role changed."
      else
        show
        render :show, status: :unprocessable_content
      end
    end

    # R-3: the status and the sessions move together, so a suspended user
    # cannot keep browsing on a token issued a minute ago.
    def suspend
      before = @user.status
      User.transaction do
        @user.update!(status: "suspended")
        @user.sessions.delete_all
      end
      audit("suspend", target: @user, changes: { "status" => { "before" => before, "after" => "suspended" } })
      redirect_to admin_user_path(@user), notice: "Suspended."
    end

    def unsuspend
      before = @user.status
      @user.update!(status: "active")
      audit("unsuspend", target: @user, changes: { "status" => { "before" => before, "after" => "active" } })
      redirect_to admin_user_path(@user), notice: "Unsuspended."
    end

    # R-4: the DELETE /me path, never a raw destroy. The row stays for the
    # purge window so the job can hand the user's hosted rows over first.
    def destroy
      now = Time.current
      before = @user.status
      User.transaction do
        @user.update!(status: "deleted", deleted_at: now)
        @user.sessions.delete_all
        @user.devices.find_each(&:unlink!)
      end
      AccountDeletionJob.perform_later(@user.id)
      audit("destroy", target: @user, changes: { "status" => { "before" => before, "after" => "deleted" } })
      redirect_to admin_users_path, notice: "Deletion started. The row is purged after #{User::PURGE_AFTER.inspect}."
    end

    private

    def load_user
      @user = User.find(params[:id])
    end

    def require_admin_role!
      redirect_to admin_root_path, alert: BaseController::ROLE_FLASH unless current_admin.admin?
    end

    # A deleted row is already on its way out; re-running any of these would
    # only push its purge date back.
    def require_live_user!
      redirect_to admin_user_path(@user), alert: "That account is already deleted." if @user.deleted?
    end

    def role_param
      params.dig(:user, :role).presence_in(User::ROLES) || @user.role
    end

    def scoped_users
      scope = User.order(created_at: :desc)
      return scope if @query.blank?

      like = "%#{User.sanitize_sql_like(@query)}%"
      scope.where("users.email ILIKE :q OR users.id IN (SELECT user_id FROM profiles WHERE handle ILIKE :q)", q: like)
    end
  end
end
