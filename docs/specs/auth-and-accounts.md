# Spec: Auth and accounts

Status: draft. Phase: 0 (sign-in, sessions, devices, deletion, Settings skeleton), 2 (remaining Settings sections). Last updated: 2026-09-06.
Depends on: design-system-and-theming.md (S26 and S27 chrome, PrimaryButton). Related decisions: ADR 0006, `docs/architecture.md` section 3.8, gaps items 2 and 3, App Store guidelines 4.8 and 5.1.1(v).

## Summary

Browsing never needs an account. An account exists so a person can RSVP, post, follow, comment, create, or claim, and it is created in one tap with Sign in with Apple or Google, exchanged for an opaque session token the API can revoke. Anonymous devices are known by `X-Device-Id` so push and home area work before sign-in. Deletion is in-app, soft for 30 days, then purged, with the Apple token revoked, so the app clears App Store review without a support inbox in the loop.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to use the whole app without an account so that I am never asked to sign in to look at a meet. |
| US-2 | As a browser, I want to tap "I'm going" and finish signing in inside a sheet so that the RSVP completes without me finding the button again. |
| US-3 | As a member, I want Sign in with Apple to hide my email if I choose so that my address is not in another database. |
| US-4 | As a member, I want to sign out on this phone and stay signed in on my iPad so that sessions are per device. |
| US-5 | As a member, I want to delete my account from Settings and know what happens to my content so that I can leave cleanly. |
| US-6 | As the builder, I want roles (`member`, `moderator`, `admin`) enforced by Pundit so that every write endpoint answers the same question the same way. |
| US-7 | As a browser, I want push registration and my home area to survive until I sign in so that signing in does not reset the app. |

## Scope

In Phase 0: `users`, `identities`, `sessions`, `devices`, and the minimal `profiles` row created at sign-up; `POST /auth/apple`, `POST /auth/google`, `DELETE /auth/session`, `GET /me`, `PATCH /me` (handle and display name only), `DELETE /me`, `POST /devices`, `PATCH /devices/:anonymous_id`; token verifiers and session issuer; Pundit base policy and error mapping; rate limits on `/auth/*`; the sign-in sheet (S26) with the pending-action pattern; the Settings skeleton (S27) with Account and About sections; delete account (S35); `AccountDeletionJob`, `AccountPurgeJob`, `SessionSweepJob`.

In Phase 2: the remaining Settings sections listed under Screens, each owned by the spec named there.

Not in this spec: profile fields beyond handle and display name (profiles-and-follow.md); notification preferences and push permission (notifications.md); home area and location permission (discovery.md); blocked users list (moderation-and-safety.md); admin sign-in with Google Identity Services (admin.md, which reuses `Auth::GoogleTokenVerifier`); web sign-in, web cookies, and web RSVP, which are Phase 7 and out of scope here, so `apps/web` ships no `/sign-in` route and no session cookie at launch.

## Requirements

**Data**

- R-1 A user MUST have at least one `identities` row; `identities` is unique on `(provider, provider_uid)`; `users.email` is citext and unique when present and null when the only identity uses an Apple relay address. (US-3)
- R-2 A `sessions` row MUST store only `token_digest` (SHA256 of a 32-byte base64url token), `expires_at` (90 days), `last_used_at`, `device_id`, `ip`, `user_agent`; the raw token MUST never be persisted or logged. (US-4)
- R-3 A `devices` row is keyed by client-generated `anonymous_id`; `user_id` is null until sign-in, set on sign-in, and cleared on sign-out and deletion, and `push_token` is cleared with it. (US-7)
- R-4 Sign-up MUST create `users`, `identities`, and `profiles` in one transaction, with `profiles.handle` generated (lowercase, `[a-z0-9_]`, 3 to 24 chars, from the provider name or email local part, 2 to 4 random digits appended on collision) and `profiles.display_name` from Apple `full_name` or the Google `name` claim, falling back to the handle. (US-2)
- R-5 Account linking MUST happen only when a new identity's email is verified by the provider, is not an `@privaterelay.appleid.com` address, and matches an existing active user's `users.email`; otherwise a new user is created. (US-3)

**API**

- R-6 `POST /auth/apple` MUST verify `identity_token` against Apple's JWKS (Solid Cache 24 h, refetch once on unknown `kid`), check `iss` `https://appleid.apple.com`, `aud` equal to the iOS bundle id, `exp`, and that SHA256 of the submitted `nonce` equals the token's `nonce` claim, and MUST return 401 `unauthenticated` on any failure without revealing which check failed. (US-2)
- R-7 `POST /auth/apple` MUST persist `full_name` into `profiles.display_name` only when the identity is new and `full_name` is present, and MUST ignore it on later calls. (US-2)
- R-8 `POST /auth/apple` MUST exchange `authorization_code` at Apple's token endpoint and store the returned refresh token encrypted on the identity for later revocation (see Risks for the column). (US-5)
- R-9 `POST /auth/google` MUST verify `id_token` against Google's JWKS with `iss` in `accounts.google.com` or `https://accounts.google.com`, `aud` equal to the iOS client id, `exp`, and `email_verified`, using `Auth::GoogleTokenVerifier`, the same class admin.md uses with a different audience. (US-2)
- R-10 Both auth endpoints MUST respond `{ token, user, is_new }` where `user` is the `GET /me` shape, MUST link the `X-Device-Id` device to the user, and MUST return 403 `forbidden` with `details.reason` `suspended` for a suspended user. (US-2, US-7)
- R-11 A session MUST be refreshed to 90 days from now when a request arrives with under 30 days remaining, writing `expires_at` and `last_used_at` at most once per hour per session; an expired or unknown token on an auth-required endpoint MUST return 401 `unauthenticated`, and on an anonymous-allowed endpoint MUST be treated as no token. (US-4)
- R-12 `DELETE /auth/session` MUST delete only the calling session row, unlink the device, and return 204. (US-4)
- R-13 `GET /me` MUST return `{ id, email, role, status, created_at, profile: Profile, identities: [{ provider, email }], notification_prefs }`; `PATCH /me` in Phase 0 MUST accept `profile: { handle, display_name }` only, returning 422 `validation_failed` with `details.handle` on a taken or invalid handle. (US-2)
- R-14 `DELETE /me` MUST return 202, set `users.status` `deleted` and `deleted_at`, delete every session of the user, unlink devices, and enqueue `AccountDeletionJob`; it is reachable from Settings without contacting support (guideline 5.1.1(v)). (US-5)
- R-15 `AccountDeletionJob` MUST, at request time: revoke the Apple refresh token at `https://appleid.apple.com/auth/revoke` when present; make `GET /users/:handle` return 404; delete `rsvps`, `check_ins`, `follows` in both directions, `blocks` in both directions, `notifications`, `imports`, `vehicles`, and `club_memberships` (transferring `owner` to the app account when the user was the sole owner); set the user's `posts` and `comments` to `status` `hidden`; reject the user's pending `claim_requests`; and move published `events` the user hosts to the app account as unclaimed (`host_type` `User`, `host_id` app account, `host_name` refreshed, `claimed_at` null) while deleting the user's drafts. (US-5)
- R-16 `AccountPurgeJob` (nightly) MUST hard-delete users with `deleted_at` older than 30 days together with `identities`, `sessions`, `profiles`, the avatar blob, `posts` with their `photos`, blobs, and `external_media`, and `comments` (replies to a deleted comment keep their row with `parent_id` null), and MUST reassign `created_by_id` on `events`, `venues`, and `spots` to the app account. (US-5)
- R-17 Signing in with the same identity during the 30-day window MUST restore the account (`status` `active`, `deleted_at` null, hidden posts and comments back to `visible`) and return `is_new: false`. (US-5)
- R-18 `POST /devices` MUST upsert on `anonymous_id` with `platform`, `push_token`, `app_version`, `home_location`, `timezone`; `PATCH /devices/:anonymous_id` MUST update `push_token`, `push_enabled`, `app_version`, `home_location`, `timezone` only, and MUST return 404 for an unknown id. (US-7)
- R-19 rack-attack MUST throttle `/auth/*` to 10 per minute per IP with 429 `rate_limited` and `Retry-After`, in addition to the global anonymous and authenticated limits in `docs/api.md`. (US-6)
- R-20 `ApplicationPolicy` MUST default-deny, accept a nil user, expose `admin?` and `moderator?`, and `Pundit::NotAuthorizedError` MUST map to 403 `forbidden`; a suspended user's token MUST be rejected on every authenticated request with 403 and `details.reason` `suspended`. (US-6)

**Mobile**

- R-21 Any gated action (RSVP, post, follow, comment, create, claim) on a signed-out client MUST open S26 as a form sheet, keep the pending action in the auth store, and run it once `GET /me` succeeds after sign-in; cancelling the sheet MUST drop the pending action without an error. (US-1, US-2)
- R-22 S26 MUST show the native Apple button first and a Google button second at the same height, with the explanatory line and the legal line from Copy; no email or password field MAY appear. (US-2, guideline 4.8)
- R-23 The Apple flow MUST generate a random nonce, pass its SHA256 to `expo-apple-authentication`, and send the raw nonce, `identityToken`, `authorizationCode`, and `fullName` (when non-null) to `POST /auth/apple`. (US-2)
- R-24 The session token MUST be stored in `expo-secure-store` under `curb.session`, sent as `Authorization: Bearer`, and cleared (with the auth store reset to signed out) on any 401; `X-Device-Id` MUST be a UUID persisted in MMKV under `curb.deviceId` and sent on every request. (US-4, US-7)
- R-25 On launch with a stored token the app MUST call `GET /me` once to hydrate; on failure other than 401 it MUST keep the token and treat the user as signed in with stale data. (US-4)
- R-26 S35 MUST explain the 30-day window and content rules, require a system confirmation alert, call `DELETE /me`, then sign the client out locally and show the confirmation copy. (US-5)
- R-27 S27 MUST render the sections in Screens with the signed-out variant showing Theme, Sign in, and About only. (US-1)

**Web**

- R-28 None in this phase: web is read-only at launch, so no web route may set or read a session cookie, and the web API client MUST send only `X-Device-Id`. (US-1)

**Admin and jobs**

- R-29 `SessionSweepJob` (nightly) MUST delete sessions past `expires_at`; `AccountPurgeJob` MUST log each purged user id to Sentry breadcrumbs, never the email. (US-4, US-5)

## Data

`users` (`email`, `role`, `status`, `deleted_at`, `last_seen_at`), `identities` (`provider`, `provider_uid`, `email`, `email_verified`, `raw_claims`), `sessions` (all columns), `devices` (all columns), `profiles` (`handle`, `display_name` at creation; other columns in profiles-and-follow.md). The app account is the `users` row with `profiles.handle` `curb`, created by `db/seeds.rb`, and is the host of record for unclaimed events (gaps item 5). Migration in this spec: the Phase 0 migration creating these five tables with the indexes in `docs/data-model.md`, plus the proposed encrypted refresh token column (Risks).

## API

`POST /auth/apple`, `POST /auth/google`, `DELETE /auth/session`, `GET /me`, `PATCH /me` (Phase 0 subset), `DELETE /me`, `POST /devices`, `PATCH /devices/:anonymous_id`, all as in `docs/api.md`. Deltas specific to this spec: auth endpoints return 201 when `is_new` is true and 200 otherwise, and 403 `forbidden` with `details: { reason: "suspended" }` for suspended users; `GET /me` includes `identities: [{ provider, email }]` so Settings can show linked methods; `DELETE /me` responds `{ data: { purge_after: "<ISO8601>" } }` with 202. Rate limits: `/auth/*` 10 per minute per IP.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S26 | Sign-in sheet | `sign-in` (modal) / `/sign-in` (Phase 7) | Sign in with Apple, Continue with Google, Cancel | loading (button busy), provider error, cancelled (sheet stays, no message), offline (buttons disabled with reason), suspended |
| S27 | Settings | `settings` / none | Open a section, sign out | signed-out, offline (read-only sections still render), permission denied deep link (Phase 2, notifications.md) |
| S35 | Delete account | `settings/delete-account` / none | Delete my account | confirmation, in progress, error, offline (button disabled) |
| S07 | Me (consumer) | `(tabs)/me` / none | Sign in (opens S26 with no pending action), Settings | signed-out state owned by profiles-and-follow.md; the sign-in button is this spec's |

Settings sections and owners: Account (email or "Hidden by Apple", linked methods, Sign out, Delete account) this spec, Phase 0; Theme (S38) design-system-and-theming.md, Phase 0; About (version, build, Terms, Privacy, Community guidelines, Contact) this spec, Phase 0 with placeholder URLs until W16 ships in Phase 2; Profile (Edit profile, S28) profiles-and-follow.md, Phase 2; Location (home area, precise or approximate) discovery.md, Phase 2; Notifications notifications.md, Phase 2; Privacy (profile visibility Later, Blocked users) moderation-and-safety.md, Phase 2.

## Copy

| Where | String |
|---|---|
| S26 headline | Sign in to curb |
| S26 explainer | Sign in to mark yourself going, post photos, and follow hosts. Browsing is always free. |
| S26 Apple button | Sign in with Apple |
| S26 Google button | Continue with Google |
| S26 legal line | By signing in you agree to the terms and privacy policy. |
| S26 provider error | Couldn't sign in. Try again. |
| S26 offline | You're offline. Sign in when you're back online. |
| S26 suspended | This account is suspended. Email hello@curbsocial.club if you think that's a mistake. |
| S26 restored (after R-17) | Welcome back. Your account is no longer scheduled for deletion. |
| S27 Account, email hidden | Email hidden by Apple |
| S27 Account, linked methods | Signed in with Apple, Signed in with Google |
| S27 Sign out | Sign out |
| S27 Delete account row | Delete account |
| S27 signed-out Account row | Sign in |
| S27 About rows | Version 1.0 (123), Terms, Privacy, Community guidelines, Contact hello@curbsocial.club |
| S35 headline | Delete your account |
| S35 body | Your profile, garage, RSVPs, and follows are removed now. Your photos and comments are hidden now and deleted in 30 days. Meets you host stay listed as unclaimed so people can still find them. Sign in again within 30 days to undo this. |
| S35 button | Delete my account |
| S35 alert title | Delete your account? |
| S35 alert buttons | Delete, Cancel |
| S35 in progress | Deleting |
| S35 done | Your account is scheduled for deletion. Sign in before {date} to keep it. |
| S35 error | Couldn't delete your account. Check your connection and try again. |
| Sign-out toast | Signed out on this phone. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | Apple JWKS stubbed with WebMock and a signed test token with a fresh `sub`, plus `full_name` and `X-Device-Id` | `POST /auth/apple` | 201 with `is_new: true`, one `users`, `identities`, `profiles`, `sessions` row; `display_name` from `full_name`; the device row's `user_id` is set; `sessions.token_digest` equals SHA256 of the returned token and the raw token appears nowhere in the database | R-4, R-6, R-7, R-10, R-2 |
| AC-2 | The same identity again, with `full_name: { givenName: "Other" }` | `POST /auth/apple` | 200 with `is_new: false`, the same `user.id`, `display_name` unchanged, a second session row | R-7, R-10 |
| AC-3 | Tokens with a bad signature, a wrong `aud`, an `exp` in the past, and a mismatched `nonce` | `POST /auth/apple` four times | 401 `unauthenticated` each time with an identical message | R-6 |
| AC-4 | An existing user with a verified non-relay email from Google | `POST /auth/apple` with a token carrying the same email, `email_verified: true` | One user with two identities; the same request with an `@privaterelay.appleid.com` email creates a second user | R-5 |
| AC-5 | A session with `expires_at` 20 days out and `last_used_at` two hours ago | `GET /me` | `expires_at` is now about 90 days out; a session with 60 days left is unchanged; a session expired yesterday gets 401 | R-11 |
| AC-6 | A signed-in user with a linked device | `DELETE /auth/session` | 204; the token then returns 401 on `GET /me`; the device row has `user_id` and `push_token` null; the user's other session still works | R-12, R-3 |
| AC-7 | `PATCH /me` with `profile.handle` equal to another user's handle, then with `Bad Handle!` | Both requests | 422 `validation_failed` with `details.handle` present each time; a valid handle returns 200 | R-13 |
| AC-8 | A user with Apple identity, a hosted published event, a draft, an RSVP, a follow, a post, and a sole club ownership | `DELETE /me` and the job runs, with the Apple revoke endpoint stubbed | 202; revoke was called once; `GET /users/:handle` 404; the RSVP and follow are gone; the post is `hidden`; the event is hosted by the app account with `claimed_at` null; the draft is gone; the club owner is the app account | R-14, R-15 |
| AC-9 | A user with `deleted_at` 31 days ago and posts with photos | `AccountPurgeJob` runs | The user, identities, sessions, profile, posts, photos, blobs, and comments are gone; replies to their comments remain with `parent_id` null; their venue's `created_by_id` is the app account | R-16 |
| AC-10 | A user with `deleted_at` 5 days ago | `POST /auth/google` with the same identity | 200, `is_new: false`, `status` `active`, `deleted_at` null, hidden posts `visible` | R-17 |
| AC-11 | A user with `status` `suspended` | `POST /auth/google`, then `GET /me` with a pre-existing token | 403 `forbidden` with `details.reason` `suspended` both times | R-10, R-20 |
| AC-12 | An unknown `anonymous_id` | `POST /devices` twice with different `app_version` and `timezone`, then `PATCH /devices/:anonymous_id` with `user_id` in the body | One row with the latest `app_version` and `timezone`; the PATCH ignores `user_id`; a PATCH to a random id is 404 | R-18 |
| AC-13 | One IP | 11 `POST /auth/apple` requests within a minute | The 11th is 429 `rate_limited` with `Retry-After` | R-19 |
| AC-14 | A shared example `it_behaves_like "anonymous-allowed"` | Applied to `GET /health` with `Authorization: Bearer garbage` | 200, not 401 | R-11 |
| AC-15 | The app signed out, on device, on a Phase 2 build | Follow is tapped on a host page | S26 opens; after Apple sign-in the sheet closes and the button reads Following without another tap; Cancel instead returns to the page with no message | R-21, R-23 |
| AC-16 | S26 on device | Visual check | Apple button is first and the same height as the Google button; the explainer and legal line match Copy | R-22 |
| AC-17 | A signed-in device with airplane mode on | The app is relaunched | The user still appears signed in on S07 with cached profile data; S26 buttons show the offline reason when opened | R-25, offline state |
| AC-18 | S35 on device | Delete my account is tapped and confirmed | The alert copy matches; after 202 the app is signed out and shows the done copy with the date from `purge_after` | R-26 |
| AC-19 | Every `apps/web` route | `curl -i` on `/` and `/meets/:slug` | No `HttpOnly` session or auth cookie in `Set-Cookie` (the `curb_device` and `curb_theme` conveniences in web.md are allowed) and no `/sign-in` route (404) | R-28 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/auth_spec.rb spec/requests/api/v1/me_spec.rb spec/requests/api/v1/devices_spec.rb spec/services/auth/*_spec.rb spec/jobs/account_deletion_job_spec.rb spec/jobs/account_purge_job_spec.rb spec/policies/application_policy_spec.rb` (rswag specs generate the OpenAPI paths; WebMock stubs for JWKS, Apple token and revoke endpoints) |
| Rate limit | `spec/requests/rack_attack_spec.rb` with `Rack::Attack.enabled = true` and a memory cache store |
| Mobile | Jest: `useAuthStore.test.ts` (pending action runs once after hydrate, cleared on cancel), `apiClient.test.ts` (401 clears the token). Manual on a physical iPhone in Marine Layer light and dark: AC-15 to AC-18. Maestro `sign_in.yaml` once flows exist. |
| Web | `pnpm --filter @curb/web test` Playwright asserting AC-19 |
| Design | Figma "iOS Screens": Sign-in sheet, Settings, Delete account (to be added in the Phase 0 design pass); flat rendering per design-system-and-theming.md AC-17 |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md: add `identities.provider_refresh_token` (text, Active Record encrypted, nullable) to hold the Apple refresh token for revocation at deletion. `raw_claims` is for debugging and must not carry secrets.
- Adopted 2026-09-06 into docs/data-model.md: `reports.reporter_id` and `moderation_actions.moderator_id` become nullable so purging a user keeps the audit trail; document the app account (`handle` `curb`) as a seeded system user.
- Adopted 2026-09-06 into docs/architecture.md section 3.8: deletion hides posts and comments at request time and hard-deletes them at purge rather than "anonymizing", because there is no sentinel user and Apple's guidance favors removal.
- Adopted 2026-09-06 into docs/api.md: `DELETE /me` returns `{ purge_after }`, and `GET /me` includes `identities`.
- Gaps item 2: `aud` for Apple is the bundle id `club.curbsocial.app`, a placeholder until the domain is confirmed; the verifier reads it from `APPLE_BUNDLE_ID`. Google client ids come from `GOOGLE_IOS_CLIENT_ID` and, for admin.md, `GOOGLE_ADMIN_CLIENT_ID`.
- Gaps item 3: the About links point at placeholder URLs on `curbsocial.club` until W16 ships in Phase 2; App Store submission needs them live.
- Restoring a deleted account within 30 days is a product choice, not a requirement; if App Review objects, drop R-17 and purge at request time.
- Apple's revoke endpoint needs a client secret JWT signed with the Sign in with Apple key; store the key id, team id, and private key as env vars, never in the repo.
- Handle generation from Apple `full_name` may produce a handle the user never sees; Phase 2's S28 is where they change it, and `is_new: true` is the hook for prompting.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 0) | Migration for `users`, `identities`, `sessions`, `devices`, `profiles` (minimal); models and validations; handle generator; app account seed; `Auth::AppleTokenVerifier`, `Auth::GoogleTokenVerifier`, `Auth::SessionIssuer`; service specs with stubbed JWKS | R-1 to R-5, R-6, R-9 | AC-3, AC-4 (service level) |
| 2 (Phase 0) | `POST /auth/apple`, `POST /auth/google`, `DELETE /auth/session`, `Authenticate` concern with sliding expiry and anonymous handling, `POST /devices`, `PATCH /devices/:anonymous_id`, rswag specs, rack-attack rules | R-6 to R-12, R-18, R-19 | AC-1 to AC-6, AC-12 to AC-14 |
| 3 (Phase 0) | `GET /me`, `PATCH /me` (subset), `DELETE /me`, `AccountDeletionJob`, `AccountPurgeJob`, `SessionSweepJob`, `ApplicationPolicy` and error mapping, `config/recurring.yml` entries | R-13 to R-17, R-20, R-29 | AC-7 to AC-11 |
| 4 (Phase 0) | Mobile auth store with pending action, secure-store token, `X-Device-Id`, API client 401 handling, S26 with Apple and Google, S07 signed-out sign-in button | R-21 to R-25 | AC-15 to AC-17 |
| 5 (Phase 0) | S27 skeleton (Account, Theme hook-in, About), S35 with confirmation and copy, sign-out | R-26, R-27 | AC-18, design-system AC-17 cells for S27 and S35 |
| 6 (Phase 2) | Remaining Settings sections wired to their owning specs; web check that no cookie or sign-in route exists | R-27, R-28 | AC-19 |
