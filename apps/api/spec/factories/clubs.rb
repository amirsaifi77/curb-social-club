FactoryBot.define do
  factory :club do
    transient do
      # The owner membership every club needs (clubs spec R-3); nil skips it.
      owner { association(:user, strategy: :create) }
    end

    sequence(:name) { |n| "Back Bay Air-Cooled #{n}" }
    sequence(:slug) { |n| "back-bay-air-cooled-#{n}" }
    description { "Air-cooled Porsches, most Saturdays, Back Bay." }
    home_location { GeoFixtures.point(:lido) }
    home_label { "Newport Beach, CA" }
    join_policy { "open" }
    status { "active" }
    association :created_by, factory: :user

    after(:create) do |club, context|
      create(:club_membership, :owner, club: club, user: context.owner) if context.owner
    end

    trait :hidden do
      status { "hidden" }
    end

    trait :verified do
      verified { true }
    end

    trait :invite_only do
      join_policy { "invite_only" }
      invite_code { SecureRandom.alphanumeric(12).downcase }
    end
  end

  factory :club_membership do
    club
    user
    role { "member" }
    status { "active" }

    trait :owner do
      role { "owner" }
      club { association :club, owner: nil }
    end

    trait :admin do
      role { "admin" }
    end

    trait :invited do
      status { "invited" }
      association :invited_by, factory: :user
    end
  end
end
