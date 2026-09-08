require "rails_helper"

# json-schema's MultiJSON path is incompatible with the json 3.x gem
# (JSON.parse dropped its second positional argument); parse with the json
# gem directly, as the json-schema deprecation notice recommends.
JSON::Validator.use_multi_json = false

RSpec.configure do |config|
  # Root for generated OpenAPI files; swagger/v1/openapi.yaml is committed
  # and consumed by packages/types (docs/architecture.md section 6).
  config.openapi_root = Rails.root.join("swagger").to_s

  config.openapi_specs = {
    "v1/openapi.yaml" => {
      openapi: "3.0.1",
      info: {
        title: "Curb Social Club API",
        version: "v1",
        description: "REST API for Curb Social Club. Public read endpoints work without a token."
      },
      paths: {},
      servers: [
        { url: "http://localhost:3000", description: "Development" },
        { url: "https://api.curbsocial.club", description: "Production (domain unconfirmed)" }
      ],
      components: {
        securitySchemes: {
          bearer: { type: :http, scheme: :bearer, description: "Opaque session token from POST /v1/auth/apple or /v1/auth/google" }
        },
        parameters: {
          deviceId: { name: "X-Device-Id", in: :header, required: false, schema: { type: :string, format: :uuid },
                      description: "Client-generated device UUID sent on every request from mobile and web" }
        },
        schemas: {
          Error: {
            type: :object,
            properties: {
              error: {
                type: :object,
                properties: { code: { type: :string }, message: { type: :string }, details: { type: :object, nullable: true, additionalProperties: true } },
                required: %w[code message]
              }
            },
            required: %w[error]
          },
          Profile: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, handle: { type: :string }, display_name: { type: :string },
              bio: { type: :string, nullable: true }, avatar_url: { type: :string, nullable: true },
              home_label: { type: :string, nullable: true }, is_host: { type: :boolean },
              links: { type: :object, additionalProperties: { type: :string } },
              clubs: { type: :array, items: { "$ref" => "#/components/schemas/ClubSummary" },
                       description: "Active memberships, each with the member's role" },
              counts: { type: :object, additionalProperties: { type: :integer } },
              viewer: {
                type: :object,
                properties: { following: { type: :boolean }, blocked: { type: :boolean }, is_self: { type: :boolean }, reported: { type: :boolean } },
                required: %w[following blocked is_self reported]
              }
            },
            required: %w[id handle display_name is_host links clubs counts viewer]
          },
          User: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, email: { type: :string, nullable: true },
              role: { type: :string, enum: %w[member moderator admin] },
              status: { type: :string, enum: %w[active suspended deleted] },
              created_at: { type: :string, format: "date-time" },
              profile: { "$ref" => "#/components/schemas/Profile" },
              identities: {
                type: :array,
                items: {
                  type: :object,
                  properties: { provider: { type: :string, enum: %w[apple google] }, email: { type: :string, nullable: true } },
                  required: %w[provider email]
                }
              },
              notification_prefs: { type: :object, additionalProperties: true },
              unread_notifications_count: { type: :integer }
            },
            required: %w[id role status created_at profile identities notification_prefs]
          },
          Host: {
            type: :object,
            description: "One shape for every host type (ADR 0010); switch on type only for the link target.",
            properties: {
              type: { type: :string, enum: %w[user club sponsor] }, id: { type: :string, format: :uuid },
              slug: { type: :string, nullable: true }, name: { type: :string, nullable: true },
              avatar_url: { type: :string, nullable: true }, verified: { type: :boolean },
              kind: { type: :string, enum: %w[brand vendor venue], nullable: true }
            },
            required: %w[type id slug name avatar_url verified kind]
          },
          EventSummary: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, slug: { type: :string }, title: { type: :string },
              cover_url: { type: :string, nullable: true }, cover_blurhash: { type: :string, nullable: true },
              tags: { type: :array, items: { type: :string, enum: Event::TAGS } },
              recurring: { type: :boolean }, rrule_text: { type: :string, nullable: true },
              host: { allOf: [ { "$ref" => "#/components/schemas/Host" } ], nullable: true,
                      description: "Null only while the host row is missing; HostConsistencyJob reports the drift" },
              venue: {
                type: :object,
                properties: {
                  id: { type: :string, format: :uuid }, name: { type: :string }, city: { type: :string, nullable: true },
                  location: { type: :object, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] }
                },
                required: %w[id name city location]
              },
              next_occurrence: {
                type: :object, nullable: true,
                properties: {
                  id: { type: :string, format: :uuid }, starts_at: { type: :string, format: "date-time" },
                  ends_at: { type: :string, format: "date-time" }, timezone: { type: :string },
                  going_count: { type: :integer }, status: { type: :string, enum: EventOccurrence::STATUSES }
                },
                required: %w[id starts_at ends_at timezone going_count status]
              },
              distance_m: { type: :integer, nullable: true, description: "Meters from near, computed in PostGIS; null without near" },
              source: { type: :object, nullable: true, properties: { type: { type: :string, nullable: true }, url: { type: :string } }, required: %w[type url] },
              claimed: { type: :boolean }, cadence: { type: :string, enum: Event::CADENCES },
              stale: { type: :boolean, description: "Unclaimed and not confirmed within 30 days (R-25)" },
              last_confirmed_at: { type: :string, format: "date-time", nullable: true },
              sponsors_preview: {
                type: :array, maxItems: 2,
                items: {
                  type: :object,
                  properties: {
                    id: { type: :string, format: :uuid }, slug: { type: :string }, name: { type: :string },
                    logo_url: { type: :string, nullable: true }, role: { type: :string, enum: EventSponsorship::ROLES }
                  },
                  required: %w[id slug name logo_url role]
                }
              }
            },
            required: %w[id slug title cover_url cover_blurhash tags recurring rrule_text host venue next_occurrence distance_m source claimed cadence stale last_confirmed_at sponsors_preview]
          },
          MiniProfile: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, handle: { type: :string }, display_name: { type: :string },
              avatar_url: { type: :string, nullable: true }
            },
            required: %w[id handle display_name avatar_url]
          },
          ClubSummary: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, slug: { type: :string }, name: { type: :string },
              avatar_url: { type: :string, nullable: true }, verified: { type: :boolean },
              home_label: { type: :string, nullable: true }, members_count: { type: :integer },
              followers_count: { type: :integer }, join_policy: { type: :string, enum: Club::JOIN_POLICIES },
              distance_m: { type: :integer, nullable: true, description: "Meters from near, computed in PostGIS; null without near" },
              role: { type: :string, enum: ClubMembership::ROLES, nullable: true,
                      description: "The viewed member's role, set only on GET /users/:handle/clubs" }
            },
            required: %w[id slug name avatar_url verified home_label members_count followers_count join_policy distance_m role]
          },
          Club: {
            description: "Club detail: ClubSummary plus the page's own fields.",
            allOf: [
              { "$ref" => "#/components/schemas/ClubSummary" },
              {
                type: :object,
                properties: {
                  description: { type: :string, nullable: true }, banner_url: { type: :string, nullable: true },
                  links: { type: :object, additionalProperties: { type: :string } }, events_count: { type: :integer },
                  upcoming_events: { type: :array, maxItems: 3, items: { "$ref" => "#/components/schemas/EventSummary" } },
                  members_preview: { type: :array, maxItems: 8, items: { "$ref" => "#/components/schemas/MiniProfile" } },
                  viewer: {
                    type: :object,
                    properties: {
                      following: { type: :boolean },
                      membership: {
                        type: :object, nullable: true,
                        properties: { role: { type: :string, enum: ClubMembership::ROLES }, status: { type: :string, enum: ClubMembership::STATUSES } },
                        required: %w[role status]
                      },
                      can_manage: { type: :boolean }
                    },
                    required: %w[following membership can_manage]
                  }
                },
                required: %w[description banner_url links events_count upcoming_events members_preview viewer]
              }
            ]
          },
          Sponsor: {
            description: "Sponsor detail: SponsorSummary plus the page's own fields.",
            allOf: [
              { "$ref" => "#/components/schemas/SponsorSummary" },
              {
                type: :object,
                properties: {
                  description: { type: :string, nullable: true }, banner_url: { type: :string, nullable: true },
                  website: { type: :string, nullable: true }, links: { type: :object, additionalProperties: { type: :string } },
                  events_count: { type: :integer },
                  upcoming_events: {
                    type: :array, maxItems: 3,
                    items: {
                      allOf: [
                        { "$ref" => "#/components/schemas/EventSummary" },
                        { type: :object, properties: { relation: { type: :string, enum: %w[host sponsor] } }, required: %w[relation] }
                      ]
                    }
                  },
                  viewer: { type: :object, properties: { following: { type: :boolean } }, required: %w[following] }
                },
                required: %w[description banner_url website links events_count upcoming_events viewer]
              }
            ]
          },
          SponsorSummary: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, slug: { type: :string }, name: { type: :string },
              kind: { type: :string, enum: Sponsor::KINDS }, logo_url: { type: :string, nullable: true },
              verified: { type: :boolean }, tagline: { type: :string, nullable: true },
              followers_count: { type: :integer }, home_label: { type: :string, nullable: true },
              distance_m: { type: :integer, nullable: true, description: "Meters from near, computed in PostGIS; null without near" }
            },
            required: %w[id slug name kind logo_url verified tagline followers_count home_label distance_m]
          },
          Event: {
            description: "Event detail: EventSummary plus the fields only the detail screen needs.",
            allOf: [
              { "$ref" => "#/components/schemas/EventSummary" },
              {
                type: :object,
                properties: {
                  description: { type: :string, nullable: true }, parking_note: { type: :string, nullable: true },
                  rrule: { type: :string, nullable: true }, dtstart: { type: :string, format: "date-time", nullable: true },
                  duration_minutes: { type: :integer }, rsvp_mode: { type: :string, enum: Event::RSVP_MODES },
                  capacity: { type: :integer, nullable: true }, status: { type: :string, enum: Event::STATUSES },
                  visibility: { type: :string, enum: Event::VISIBILITIES },
                  dormant: { type: :boolean, description: "Out of lists and the map, page still served (R-27)" },
                  hidden: { type: :boolean, description: "Only ever true for the host or an admin; the public gets 410" },
                  external_host_name: { type: :string, nullable: true },
                  venue: {
                    type: :object,
                    properties: {
                      id: { type: :string, format: :uuid }, name: { type: :string },
                      address_line1: { type: :string, nullable: true }, address_line2: { type: :string, nullable: true },
                      city: { type: :string, nullable: true }, region: { type: :string, nullable: true },
                      postal_code: { type: :string, nullable: true }, country: { type: :string }, timezone: { type: :string },
                      location: { type: :object, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] }
                    },
                    required: %w[id name address_line1 address_line2 city region postal_code country timezone location]
                  },
                  upcoming_occurrences: {
                    type: :array, maxItems: 4,
                    items: {
                      type: :object,
                      properties: {
                        id: { type: :string, format: :uuid }, starts_at: { type: :string, format: "date-time" },
                        ends_at: { type: :string, format: "date-time" }, timezone: { type: :string },
                        going_count: { type: :integer }, status: { type: :string, enum: EventOccurrence::STATUSES },
                        override_note: { type: :string, nullable: true }
                      },
                      required: %w[id starts_at ends_at timezone going_count status override_note]
                    }
                  },
                  sponsorships: {
                    type: :array,
                    items: {
                      type: :object,
                      properties: {
                        sponsor: { "$ref" => "#/components/schemas/SponsorSummary" },
                        role: { type: :string, enum: EventSponsorship::ROLES },
                        note: { type: :string, nullable: true }, position: { type: :integer }
                      },
                      required: %w[sponsor role note position]
                    }
                  },
                  viewer: {
                    type: :object,
                    properties: {
                      following: { type: :boolean }, rsvp: { type: :string, enum: %w[going], nullable: true },
                      can_edit: { type: :boolean }, can_claim: { type: :boolean },
                      claim_status: { type: :string, enum: %w[pending], nullable: true }, reported: { type: :boolean }
                    },
                    required: %w[following rsvp can_edit can_claim claim_status reported]
                  },
                  photos_count: { type: :integer }, comments_count: { type: :integer }, followers_count: { type: :integer }
                },
                required: %w[description parking_note rrule dtstart duration_minutes rsvp_mode capacity status visibility
                             dormant hidden external_host_name venue upcoming_occurrences sponsorships viewer
                             photos_count comments_count followers_count]
              }
            ]
          },
          Occurrence: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, event: { "$ref" => "#/components/schemas/EventSummary" },
              starts_at: { type: :string, format: "date-time" }, ends_at: { type: :string, format: "date-time" },
              timezone: { type: :string }, status: { type: :string, enum: EventOccurrence::STATUSES },
              override_note: { type: :string, nullable: true }, going_count: { type: :integer },
              interested_count: { type: :integer }, check_in_count: { type: :integer },
              going_preview: { type: :array, items: { type: :object, additionalProperties: true } },
              viewer: {
                type: :object,
                properties: { rsvp: { type: :string, enum: %w[going], nullable: true }, checked_in: { type: :boolean } },
                required: %w[rsvp checked_in]
              }
            },
            required: %w[id event starts_at ends_at timezone status override_note going_count interested_count
                         check_in_count going_preview viewer]
          },
          MapPin: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid, description: "The occurrence" }, event_id: { type: :string, format: :uuid },
              slug: { type: :string }, lat: { type: :number }, lng: { type: :number },
              starts_at: { type: :string, format: "date-time" }, title: { type: :string }, going_count: { type: :integer },
              recurring: { type: :boolean, description: "The event is a series; S03 draws it in the recurring pin style (discovery R-15)" }
            },
            required: %w[id event_id slug lat lng starts_at title going_count recurring]
          },
          Venue: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid }, name: { type: :string },
              address_line1: { type: :string, nullable: true }, address_line2: { type: :string, nullable: true },
              city: { type: :string, nullable: true }, region: { type: :string, nullable: true },
              postal_code: { type: :string, nullable: true }, country: { type: :string, nullable: true },
              timezone: { type: :string },
              location: { type: :object, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] }
            },
            required: %w[id name address_line1 address_line2 city region postal_code country timezone location]
          },
          VenueSuggestion: {
            type: :object,
            description: "A place the provider knows and we do not. Nothing is stored until a host picks one.",
            properties: {
              name: { type: :string }, address: { type: :string }, lat: { type: :number }, lng: { type: :number },
              external_place_id: { type: :string, nullable: true }, external_source: { type: :string }
            },
            required: %w[name address lat lng external_place_id external_source]
          },
          FeedSection: {
            type: :object,
            description: "One home feed section. The item shape follows the kind: EventSummary for the three date windows, ClubSummary for clubs_nearby, SponsorSummary for sponsors_nearby.",
            properties: {
              kind: { type: :string, enum: %w[this_weekend clubs_nearby sponsors_nearby next_week later] },
              title: { type: :string },
              items: {
                type: :array,
                items: {
                  oneOf: [
                    { "$ref" => "#/components/schemas/EventSummary" },
                    { "$ref" => "#/components/schemas/ClubSummary" },
                    { "$ref" => "#/components/schemas/SponsorSummary" }
                  ]
                }
              },
              more: {
                type: :object, nullable: true,
                description: "The list this section is a window on. Params go straight to the path as a query string.",
                properties: { path: { type: :string }, params: { type: :object, additionalProperties: true } },
                required: %w[path params]
              }
            },
            required: %w[kind title items more]
          },
          Device: {
            type: :object,
            properties: {
              anonymous_id: { type: :string, format: :uuid }, platform: { type: :string, enum: %w[ios android web] },
              push_enabled: { type: :boolean }, push_token_present: { type: :boolean },
              app_version: { type: :string, nullable: true }, timezone: { type: :string, nullable: true },
              user_id: { type: :string, format: :uuid, nullable: true },
              home_location: { type: :object, nullable: true, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] },
              last_seen_at: { type: :string, format: "date-time", nullable: true }
            },
            required: %w[anonymous_id platform push_enabled push_token_present]
          }
        }
      }
    }
  }

  config.openapi_format = :yaml
end
