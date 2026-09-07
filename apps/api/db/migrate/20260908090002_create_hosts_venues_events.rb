# The Phase 1 host migration (docs/sessions.md 1.1): venues, events,
# event_occurrences, clubs, club_memberships, sponsors, event_sponsorships,
# and claim_requests, every column and index from docs/data-model.md.
# events.host_id has no FK on purpose (ADR 0010): the model checks the host
# exists and HostConsistencyJob reports drift. events.import_id gets its FK
# when the imports table lands (Phase 3).
class CreateHostsVenuesEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :venues, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.text :name, null: false
      t.text :address_line1
      t.text :address_line2
      t.text :city
      t.text :region
      t.text :postal_code
      t.text :country, null: false
      t.st_point :location, geographic: true, srid: 4326, null: false
      t.text :timezone, null: false, default: "America/Los_Angeles"
      t.text :external_place_id
      t.text :external_source, null: false, default: "manual"
      t.references :created_by, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :venues, :location, using: :gist
    add_index :venues, [ :external_source, :external_place_id ]

    create_table :clubs, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.text :name, null: false
      t.citext :slug, null: false
      t.text :description
      t.st_point :home_location, geographic: true, srid: 4326
      t.text :home_label
      t.jsonb :links, null: false, default: {}
      t.text :join_policy, null: false, default: "open"
      t.text :invite_code
      t.text :status, null: false, default: "active"
      t.boolean :verified, null: false, default: false
      t.references :created_by, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.integer :members_count, null: false, default: 0
      t.integer :followers_count, null: false, default: 0
      t.integer :events_count, null: false, default: 0
      t.timestamps
    end
    add_index :clubs, :slug, unique: true
    add_index :clubs, :invite_code, unique: true, where: "invite_code IS NOT NULL"
    add_index :clubs, :home_location, using: :gist
    add_index :clubs, :name, using: :gin, opclass: :gin_trgm_ops
    add_index :clubs, :status

    create_table :club_memberships, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :club, type: :uuid, null: false, foreign_key: true, index: false
      t.references :user, type: :uuid, null: false, foreign_key: true, index: false
      t.text :role, null: false, default: "member"
      t.text :status, null: false, default: "active"
      t.references :invited_by, type: :uuid, null: true, foreign_key: { to_table: :users }
      t.timestamptz :joined_at
      t.timestamps
    end
    add_index :club_memberships, [ :club_id, :user_id ], unique: true
    add_index :club_memberships, [ :user_id, :status ]
    # One owner per club (clubs.md R-3); the model also rejects removing it.
    add_index :club_memberships, :club_id, unique: true, where: "role = 'owner'",
              name: "index_club_memberships_on_club_id_single_owner"

    create_table :sponsors, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.text :name, null: false
      t.citext :slug, null: false
      t.text :kind, null: false
      t.text :tagline
      t.text :description
      t.text :website
      t.jsonb :links, null: false, default: {}
      t.st_point :home_location, geographic: true, srid: 4326
      t.text :home_label
      t.text :status, null: false, default: "active"
      t.boolean :verified, null: false, default: false
      t.integer :followers_count, null: false, default: 0
      t.integer :events_count, null: false, default: 0
      t.timestamps
    end
    add_index :sponsors, :slug, unique: true
    add_index :sponsors, :home_location, using: :gist
    add_index :sponsors, :name, using: :gin, opclass: :gin_trgm_ops

    create_table :events, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.text :host_type, null: false
      t.uuid :host_id, null: false
      t.text :host_name, null: false
      t.references :created_by, type: :uuid, null: false, foreign_key: { to_table: :users }
      t.references :venue, type: :uuid, null: false, foreign_key: true
      t.uuid :import_id
      t.text :title, null: false
      t.text :slug, null: false
      t.text :description
      t.text :cadence, null: false, default: "once"
      t.timestamptz :dtstart
      t.integer :duration_minutes, null: false
      t.text :timezone, null: false, default: "America/Los_Angeles"
      t.text :rrule
      t.timestamptz :rrule_until
      t.text :parking_note
      t.text :tags, array: true, null: false, default: []
      t.text :status, null: false, default: "draft"
      t.text :visibility, null: false, default: "public"
      t.text :source_url
      t.text :source_type
      t.text :external_host_name
      t.integer :capacity
      t.text :rsvp_mode, null: false, default: "open"
      t.timestamptz :published_at
      t.timestamptz :hidden_at
      t.timestamptz :claimed_at
      t.timestamptz :last_confirmed_at
      t.timestamptz :dormant_at
      t.timestamptz :venue_permission_confirmed_at
      t.text :verification_source_url
      t.timestamptz :verified_at
      t.integer :occurrences_count, null: false, default: 0
      t.integer :followers_count, null: false, default: 0
      t.integer :comments_count, null: false, default: 0
      t.timestamps
    end
    add_index :events, :slug, unique: true
    add_index :events, :tags, using: :gin
    add_index :events, [ :host_type, :host_id, :status ]
    add_index :events, :source_url, unique: true, where: "source_url IS NOT NULL"
    add_index :events, :title, using: :gin, opclass: :gin_trgm_ops
    add_index :events, :host_name, using: :gin, opclass: :gin_trgm_ops
    add_index :events, :dormant_at, where: "dormant_at IS NOT NULL"
    add_index :events, [ :claimed_at, :last_confirmed_at ]
    add_index :events, :import_id

    create_table :event_occurrences, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :event, type: :uuid, null: false, foreign_key: true, index: false
      t.timestamptz :starts_at, null: false
      t.timestamptz :ends_at, null: false
      t.st_point :location, geographic: true, srid: 4326, null: false
      t.text :status, null: false, default: "scheduled"
      t.timestamptz :overridden_at
      t.text :override_note
      t.integer :going_count, null: false, default: 0
      t.integer :interested_count, null: false, default: 0
      t.integer :check_in_count, null: false, default: 0
      t.integer :photos_count, null: false, default: 0
      t.timestamps
    end
    # Also serves the "upcoming dates" lookup (architecture.md 3.3).
    add_index :event_occurrences, [ :event_id, :starts_at ], unique: true
    add_index :event_occurrences, [ :location, :starts_at ], using: :gist
    add_index :event_occurrences, :starts_at, where: "status = 'scheduled'"

    create_table :event_sponsorships, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :event, type: :uuid, null: false, foreign_key: true, index: false
      t.references :sponsor, type: :uuid, null: false, foreign_key: true
      t.text :role, null: false
      t.text :note
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :event_sponsorships, [ :event_id, :sponsor_id ], unique: true

    create_table :claim_requests, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.references :event, type: :uuid, null: false, foreign_key: true
      t.text :claim_as_type, null: false
      t.uuid :claim_as_id, null: false
      t.text :relationship, null: false
      t.text :evidence_url
      t.boolean :venue_permission_confirmed, null: false, default: false
      t.text :status, null: false, default: "pending"
      t.references :reviewed_by, type: :uuid, null: true, foreign_key: { to_table: :users }
      t.timestamptz :reviewed_at
      t.text :review_note
      t.timestamps
    end
    add_index :claim_requests, [ :user_id, :event_id ], unique: true, where: "status = 'pending'"
    add_index :claim_requests, [ :claim_as_type, :claim_as_id ]
  end
end
