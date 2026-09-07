FactoryBot.define do
  factory :venue do
    transient do
      # Any key from GeoFixtures::ALL; :coastal and :inland pick the origins.
      fixture { :lido }
    end

    sequence(:name) { |n| "Venue #{n}" }
    address_line1 { "3636 Newport Blvd" }
    city { "Newport Beach" }
    region { "CA" }
    postal_code { "92663" }
    country { "US" }
    location { GeoFixtures.point(fixture) }
    timezone { "America/Los_Angeles" }
    external_source { "manual" }
    association :created_by, factory: :user

    trait :coastal do
      fixture { :lido }
      name { "Lido Marina Village" }
    end

    trait :inland do
      fixture { :fontana_sierra_at_foothill }
      name { "Sierra at Foothill" }
      city { "Fontana" }
      postal_code { "92335" }
    end
  end
end
