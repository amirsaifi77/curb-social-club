FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    role { "member" }
    status { "active" }
    terms_accepted_at { Time.current }

    after(:create) do |user|
      create(:profile, user: user) unless user.profile
    end

    trait :suspended do
      status { "suspended" }
    end

    trait :deleted do
      status { "deleted" }
      deleted_at { 5.days.ago }
    end

    trait :purgeable do
      status { "deleted" }
      deleted_at { 31.days.ago }
    end

    # The seeded system account (handle curb). Reuses the row when it exists
    # so a spec can call it more than once.
    factory :app_account do
      role { "admin" }
      initialize_with { User.app_account || new }

      after(:create) do |user|
        user.profile.update!(handle: "curb", display_name: "Curb Social Club", is_host: true, system_account: true)
      end
    end
  end

  factory :profile do
    user
    sequence(:handle) { |n| "driver_#{n}" }
    display_name { "Driver" }
  end

  factory :identity do
    user
    provider { "google" }
    sequence(:provider_uid) { |n| "uid-#{n}" }
    email { user.email }
    email_verified { true }

    trait :apple do
      provider { "apple" }
      provider_refresh_token { "apple-refresh-existing" }
    end
  end

  factory :device do
    anonymous_id { SecureRandom.uuid }
    platform { "ios" }
    push_token { "ExponentPushToken[test]" }
    app_version { "0.1.0" }
    timezone { "America/Los_Angeles" }
  end

  factory :session do
    user
    token_digest { Digest::SHA256.hexdigest(SecureRandom.hex(16)) }
    expires_at { 90.days.from_now }
    last_used_at { Time.current }
  end
end
