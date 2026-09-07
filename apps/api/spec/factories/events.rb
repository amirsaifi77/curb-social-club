FactoryBot.define do
  factory :event do
    transient do
      host_user { nil }
    end

    host { host_user || association(:user, strategy: :create) }
    association :created_by, factory: :user
    venue
    sequence(:title) { |n| "Cars and Coffee #{n}" }
    description { "Meet in the lot by the water. Coffee from the cart." }
    cadence { "once" }
    dtstart { GeoFixtures.next_saturday_0730 }
    duration_minutes { 120 }
    timezone { "America/Los_Angeles" }
    tags { [ "all" ] }
    status { "draft" }
    visibility { "public" }
    rsvp_mode { "open" }

    trait :published do
      status { "published" }
      published_at { 1.day.ago }
    end

    trait :cancelled do
      status { "cancelled" }
    end

    trait :club_host do
      host { association :club, strategy: :create }
    end

    trait :sponsor_host do
      host { association :sponsor, strategy: :create }
    end

    trait :weekly do
      cadence { "weekly" }
      rrule { "FREQ=WEEKLY;BYDAY=SA" }
    end

    trait :monthly do
      cadence { "monthly" }
      rrule { "FREQ=MONTHLY;BYDAY=1SU" }
    end

    trait :seasonal do
      cadence { "seasonal" }
      rrule { "FREQ=WEEKLY;BYDAY=SA" }
      rrule_until { dtstart + 60.days }
    end

    trait :announced do
      cadence { "announced" }
      dtstart { nil }
      rrule { nil }
    end

    trait :unlisted do
      visibility { "unlisted" }
    end
  end

  factory :event_occurrence do
    event
    starts_at { event.dtstart || GeoFixtures.next_saturday_0730 }
    status { "scheduled" }

    trait :past do
      starts_at { 7.days.ago.change(hour: 14, min: 30) }
    end

    trait :cancelled do
      status { "cancelled" }
      override_note { "Rained out this week" }
    end

    trait :overridden do
      overridden_at { Time.current }
      override_note { "Moved to the back lot this week" }
    end
  end
end
