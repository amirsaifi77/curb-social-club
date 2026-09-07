# Phase 0 identity tables per docs/data-model.md (Identity and access) and
# docs/specs/auth-and-accounts.md (Data). profiles uses user_id as its
# primary key; identities.provider_refresh_token is Active Record encrypted.
class CreateIdentityAndAccess < ActiveRecord::Migration[8.1]
  def change
    create_table :users, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.citext :email
      t.text :role, null: false, default: "member"
      t.text :status, null: false, default: "active"
      t.timestamptz :deleted_at
      t.timestamptz :terms_accepted_at
      t.timestamptz :last_seen_at
      t.timestamps
    end
    add_index :users, :email, unique: true, where: "email IS NOT NULL"
    add_index :users, :status
    add_index :users, :deleted_at, where: "deleted_at IS NOT NULL"

    create_table :identities, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.text :provider, null: false
      t.text :provider_uid, null: false
      t.citext :email
      t.boolean :email_verified, null: false, default: false
      t.jsonb :raw_claims, null: false, default: {}
      t.text :provider_refresh_token
      t.timestamps
    end
    add_index :identities, [ :provider, :provider_uid ], unique: true

    create_table :devices, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user, type: :uuid, null: true, foreign_key: true
      t.uuid :anonymous_id, null: false
      t.text :platform, null: false
      t.text :push_token
      t.boolean :push_enabled, null: false, default: true
      t.text :app_version
      t.st_point :home_location, geographic: true, srid: 4326
      t.text :timezone
      t.timestamptz :last_seen_at
      t.timestamps
    end
    add_index :devices, :anonymous_id, unique: true

    create_table :sessions, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.references :device, type: :uuid, null: true, foreign_key: true
      t.text :token_digest, null: false
      t.timestamptz :expires_at, null: false
      t.timestamptz :last_used_at
      t.inet :ip
      t.text :user_agent
      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true
    add_index :sessions, :expires_at

    create_table :profiles, id: false do |t|
      t.references :user, type: :uuid, null: false, primary_key: true, foreign_key: true
      t.citext :handle, null: false
      t.text :display_name, null: false
      t.text :bio
      t.st_point :home_location, geographic: true, srid: 4326
      t.text :home_label
      t.boolean :is_host, null: false, default: false
      t.jsonb :links, null: false, default: {}
      t.jsonb :notification_prefs, null: false, default: {}
      t.integer :followers_count, null: false, default: 0
      t.integer :following_count, null: false, default: 0
      t.text :visibility, null: false, default: "public"
      t.timestamps
    end
    add_index :profiles, :handle, unique: true
  end
end
