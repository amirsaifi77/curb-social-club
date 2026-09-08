module Admin
  module Clubs
    # A05 memberships (docs/specs/admin.md R-18; clubs R-3). Add by handle,
    # change a role, remove. The model owns the single-owner rule; this
    # controller only surfaces it as the form error in the Copy table.
    class MembershipsController < BaseController
      OWNER_ERROR = "A club has exactly one owner. Transfer ownership by changing another member to owner first.".freeze

      before_action :load_club
      before_action :load_membership, only: %i[update destroy]

      def index
        load_rows
      end

      def create
        user = Admin::HandleLookup.call(params.dig(:club_membership, :handle))
        @membership = @club.memberships.new(user: user, role: role_param, status: "active")
        @membership.errors.add(:base, Admin::HandleLookup::UNKNOWN) if user.nil?

        if user && save_membership
          audit("membership_create", target: @club,
                changes: { "user_id" => user.id, "handle" => user.profile&.handle,
                           "role" => { "before" => nil, "after" => @membership.role } })
          redirect_to admin_club_memberships_path(@club), notice: "Member added."
        else
          annotate_owner_error(@membership)
          load_rows
          render :index, status: :unprocessable_content
        end
      end

      def update
        before = @membership.role
        if role_param == "owner" ? transfer_ownership : @membership.update(role: role_param)
          audit("membership_update", target: @club,
                changes: { "user_id" => @membership.user_id, "role" => { "before" => before, "after" => @membership.role } })
          redirect_to admin_club_memberships_path(@club), notice: transfer_notice(before)
        else
          annotate_owner_error(@membership)
          load_rows
          render :index, status: :unprocessable_content
        end
      end

      def destroy
        if @membership.destroy
          audit("membership_destroy", target: @club,
                changes: { "user_id" => @membership.user_id,
                           "role" => { "before" => @membership.role, "after" => nil } })
          redirect_to admin_club_memberships_path(@club), notice: "Member removed."
        else
          annotate_owner_error(@membership)
          load_rows
          render :index, status: :unprocessable_content
        end
      end

      private

      # The partial unique index on one owner per club is the last word;
      # two concurrent adds should meet the form error, not a 500.
      def save_membership
        @membership.save
      rescue ActiveRecord::RecordNotUnique
        @membership.errors.add(:role, "is taken: a club has exactly one owner")
        false
      end

      def load_club
        @club = Club.find(params[:club_id])
      end

      def load_membership
        @membership = @club.memberships.find(params[:id])
      end

      # The one-owner rule blocks a second owner and the owner's removal, so
      # a transfer steps around both: demote the sitting owner by column,
      # then seat the new one, in one transaction (the ClubMembership
      # .release_for pattern). Without this the Copy table's advice, and
      # R-18's "change role", are both impossible to follow.
      def transfer_ownership
        return true if @membership.owner?

        ClubMembership.transaction do
          sitting = @club.owner_membership
          sitting&.update_columns(role: "admin", updated_at: Time.current)
          @membership.update!(role: "owner")
          audit_transfer(sitting)
        end
        true
      rescue ActiveRecord::RecordInvalid
        false
      end

      def audit_transfer(sitting)
        return if sitting.nil?

        audit("membership_demote", target: @club,
              changes: { "user_id" => sitting.user_id, "role" => { "before" => "owner", "after" => "admin" } })
      end

      def transfer_notice(before)
        return "Role changed." unless @membership.owner? && before != "owner"

        "Ownership transferred. The previous owner is now an admin."
      end

      def load_rows
        @memberships = @club.memberships.includes(user: :profile).order(:role, :created_at)
        @new_membership ||= ClubMembership.new(club: @club, role: "member")
      end

      def role_param
        params.dig(:club_membership, :role).presence_in(ClubMembership::ROLES) || "member"
      end

      # The model's message is terse; A05 owes the admin the way out of it.
      def annotate_owner_error(membership)
        return unless membership.errors.any? { |error| error.attribute == :role || error.attribute == :base }

        membership.errors.add(:base, OWNER_ERROR) unless membership.errors.full_messages.include?(OWNER_ERROR)
        @membership_error = membership
      end
    end
  end
end
