FactoryBot.define do
  factory :sponsor do
    sequence(:name) { |n| "Harbor Coffee #{n}" }
    sequence(:slug) { |n| "harbor-coffee-#{n}" }
    kind { "brand" }
    tagline { "Pour-over from the cart" }
    website { "https://example.com" }
    status { "active" }

    trait :hidden do
      status { "hidden" }
    end

    trait :vendor do
      kind { "vendor" }
    end

    trait :venue_partner do
      kind { "venue" }
    end
  end

  factory :event_sponsorship do
    event
    sponsor
    role { "coffee" }
    sequence(:position) { |n| n }
  end
end
