module Clubs
  # The club list a profile shows (profiles-and-follow R-7): active
  # memberships whose club is visible, with the avatars preloaded. One
  # definition, so GET /users/:handle and GET /users/:handle/clubs cannot
  # disagree.
  class Memberships
    def self.visible_for(user_id)
      ClubMembership.active.where(user_id: user_id)
                    .joins(:club).merge(Club.visible)
                    .includes(club: { avatar_attachment: :blob })
                    .order(:created_at, :id)
                    .to_a
    end

    def self.roles(memberships)
      memberships.to_h { |membership| [ membership.club_id, membership.role ] }
    end
  end
end
