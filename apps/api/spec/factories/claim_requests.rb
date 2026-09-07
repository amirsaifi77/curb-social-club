FactoryBot.define do
  factory :claim_request do
    # Created even under build so claim_as_id can point at a real user.
    user { association :user, strategy: :create }
    event { association :event, strategy: :create }
    claim_as_type { "User" }
    claim_as_id { user.id }
    relationship { "I organize this every Saturday" }
    evidence_url { "https://instagram.com/backbayaircooled" }
    venue_permission_confirmed { true }
    status { "pending" }

    trait :as_club do
      transient do
        club { create(:club, owner: user) }
      end

      claim_as_type { "Club" }
      claim_as_id { club.id }
    end
  end
end
