# Default-deny base policy (R-20); user may be nil for anonymous requests.
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index? = false
  def show? = false
  def create? = false
  def new? = create?
  def update? = false
  def edit? = update?
  def destroy? = false

  def admin? = user&.admin? == true
  def moderator? = admin? || user&.moderator? == true
  def member? = user.present? && user.active?

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve = @scope.none

    private

    attr_reader :user, :scope
  end
end
