# Spec: Photos and posts

Status: draft. Phase: 4. Last updated: 2026-09-06.
Depends on: events-and-occurrences.md, event-detail-and-rsvp.md, profiles-and-follow.md (blocks, garage), spots.md (spot picker S18, `spot_id` on photos), moderation-and-safety.md (image safety policy, report and block), notifications.md (`comment` kind), import-from-link.md (share intake routing). Related decisions: ADR 0011, gaps items 3, 12, 14.

## Summary

Photos are what make a meet feel alive between weekends. A member posts up to ten photos from the camera roll against a past or same-day occurrence, or shares one of their Instagram posts into curb from the iOS share sheet; Instagram posts are rendered by oEmbed and the image is never stored (ADR 0011). Posts show on the meet, the occurrence, the poster's profile, the tagged spot, and the feed, and every browser can see them without an account. Comments are flat with one level of replies, for coordination rather than conversation.

## User stories

| Id | Story |
|---|---|
| US-1 | As a member who took photos at a meet, I want to post up to ten of them against that meet so that they appear on the meet and on my profile. |
| US-2 | As a member who already posted on Instagram, I want to share that post into curb from the Instagram share sheet so that it shows on the meet without uploading it again. |
| US-3 | As a browser, I want to see recent photos on a meet, an occurrence, a spot, and the feed so that I know what a meet looks like before I go. |
| US-4 | As a browser, I want to open a post and see who took it, which meet, and where so that I can follow the person or find the spot. |
| US-5 | As a member, I want to ask the host something on a meet, or reply on a post, so that parking and rain plans get answered without a group chat. |
| US-6 | As a host, I want my replies badged and to remove comments on my meet so that the thread stays useful. |
| US-7 | As a member, I want to delete my post or change its meet and spot after posting so that a mistake is cheap to fix. |
| US-8 | As a member, I want photos checked before they are shown so that the app stays safe, with a neutral message and a way to appeal if mine is rejected. |

## Scope

In this phase: `posts` (`kind: photo` and `kind: instagram`), `photos`, `external_media`, and `comments`; the Post composer (S17) from an occurrence, from Me, and from the share intake (S19); direct upload to R2 with EXIF stripping, variants, and blurhash by a job; the image safety hook (`status: hidden` until the check passes); Instagram posts by share sheet with oEmbed, the embed card, the unavailable card, and the 24 h Solid Cache; Post detail (S16, W13); the photo grid on S08, the photo tab on S09, the Posts tab on S11; the `recent_photos` feed section; delete and `PATCH /posts/:id`; Comments (S32) on events and posts.

Not in this phase: text posts (`kind: text` stays in the data model; `POST /posts` rejects it with 422 until a later spec picks it up); likes (`likes_count` reserved, v1.1); Instagram Login (Phase 7, ADR 0011); posting or commenting on web (Phase 7); the `following` feed section (discovery.md and notifications.md); the spot picker and spot page (spots.md); the image safety vendor, thresholds, and appeal policy (moderation-and-safety.md); check-in (event-detail-and-rsvp.md, Phase 4 slice).

## Requirements

**Data**

- R-1 A post MUST have `kind` in `photo` or `instagram`, `status` in `visible`, `hidden`, `removed`, a `body` of at most 1000 characters, and an optional `event_occurrence_id`, per `docs/data-model.md`. (US-1, US-2)
- R-2 A `photo` post MUST have 1 to 10 `photos` rows with `position`, `width`, `height`, `blurhash`, an optional `spot_id`, and an optional `vehicle_id` that MUST belong to the post author. (US-1)
- R-3 An `instagram` post MUST have exactly one `external_media` row with `provider: instagram`, a unique canonical `url`, `external_id` (the shortcode), `author_handle`, `status`, and `checked_at`; no image bytes from Instagram are ever written to R2, the database, or the cache. (US-2)
- R-4 A post MAY attach only to an occurrence whose `starts_at`, in the occurrence `timezone`, falls on or before the current local calendar day; the model MUST reject a later occurrence. (US-1)
- R-5 `event_occurrences.photos_count` MUST count `photos` rows plus `external_media` rows whose post is `visible`, and `Event.photos_count` in the API MUST be the sum over the event's occurrences. (US-3)
- R-6 `ProcessPhotoJob` MUST replace the uploaded original with an EXIF-stripped copy (vips `strip: true`), convert HEIC to JPEG, generate `sm` (480 px wide), `md` (1080), and `lg` (2048) variants, compute a 4x3 blurhash, and write `width` and `height`; the unstripped original MUST NOT be retained. (US-1, US-8)
- R-7 A `photo` post MUST be created with `status: hidden` and `safety_status: pending` and MUST become `visible` only when `ImageSafetyCheckJob` (moderation-and-safety.md) marks it `passed`; an `instagram` post is created `visible` because no image is stored. (US-8)
- R-8 `DELETE /posts/:id` MUST set `status: removed`, MUST make the post and its comments return 404, and MUST enqueue `PurgePostMediaJob` to delete the blobs after the 30 day moderation retention window. (US-7)
- R-9 A comment MUST have `commentable_type` in `Event` or `Post`, a `body` of 1 to 500 characters, and a `parent_id` that is null or a top-level comment on the same commentable; a reply to a reply MUST be rejected. (US-5)

**API**

- R-10 `POST /uploads/direct` MUST accept jpeg, png, heic, and webp up to 15 MB, MUST return `{ signed_id, direct_upload: { url, headers } }`, and MUST be limited to 60 per user per hour. (US-1)
- R-11 `POST /posts` with `kind: photo` MUST accept 1 to 10 `photos[]` entries of `{ blob_id, spot_id?, vehicle_id? }`, MUST return 422 `validation_failed` for 0 or 11 entries, an unknown blob, a vehicle not owned by the author, or a future occurrence, and MUST return 201 with the Post shape including `status: hidden` and `safety_status: pending`. (US-1)
- R-12 `POST /posts` with `kind: instagram` MUST accept only URLs matching `^https?://(www\.)?instagram\.com/(p|reel)/([A-Za-z0-9_-]{5,40})/?(\?.*)?$`, MUST normalize them to `https://www.instagram.com/<p|reel>/<shortcode>/`, MUST return 422 `validation_failed` with `details.url` otherwise, and MUST return 409 `conflict` with `details.post_id` when the canonical URL already exists. (US-2)
- R-13 The synchronous oEmbed check on create MUST call Instagram oEmbed with a 2 s timeout and `omitscript=true` and MUST map the outcome as: 200 sets `author_handle`, `status: ok`, `checked_at`, and caches the body 24 h; an Instagram error naming a private post sets nothing and returns 422 `external_media_unavailable` with `details.reason: private`; any other Instagram 4xx returns the same code with `details.reason: unavailable`; a timeout or 5xx creates the post with `checked_at: null` and enqueues `RecheckExternalMediaJob`; an Instagram 429 returns 429 `rate_limited` with `Retry-After: 300`. (US-2)
- R-14 `GET /posts/:id/embed` MUST serve `{ html, width, height, author_name, provider_url, checked_at }` from Solid Cache keyed by `url`; on a miss or when `checked_at` is older than 24 h it MUST refetch, MUST update `external_media.status` and `checked_at` on a definitive answer, MUST return 410 when `status` is `private` or `unavailable`, MUST return 503 with `Retry-After: 60` and unchanged status on a transient failure, and MUST return 404 for non-Instagram posts. (US-2, US-4)
- R-15 `GET /posts/:id` MUST return 404 for `removed` posts and for `hidden` posts unless the viewer is the author or an admin, in which case it MUST include `status` and `safety_status`. (US-4, US-8)
- R-16 `PATCH /posts/:id` MUST allow only the author to change `body`, `event_occurrence_id` (subject to R-4), `photos[].spot_id`, and `spot_id` for Instagram posts, and MUST return 403 otherwise. (US-7)
- R-17 `DELETE /posts/:id` MUST be allowed for the author or an admin and MUST return 403 otherwise. (US-7)
- R-18 `GET /occurrences/:id/posts`, `GET /users/:handle/posts`, and `GET /events/:slug/posts` MUST return `visible` posts most recent first with cursor pagination, MUST exclude posts by users blocked by or blocking the viewer, and MUST work without a token. (US-3)
- R-19 `GET /feed` MUST include a `recent_photos` section of up to 12 Post items of kind `photo` or `instagram` created in the last 7 days whose occurrence location, or spot location when there is no occurrence, is within the browse radius, most recent first, omitted when empty. (US-3)
- R-20 `GET /events/:slug/comments` and `GET /posts/:id/comments` MUST return `visible` top-level comments oldest first with their replies nested one level, cursor paginated on top-level comments, excluding authors blocked by or blocking the viewer, without a token. (US-5)
- R-21 `POST /events/:id/comments` and `POST /posts/:id/comments` MUST require a user, MUST return 403 when the commenter is blocked by the event host or post author, MUST return 404 for hidden or removed parents, and MUST be limited to 60 per user per hour. (US-5)
- R-22 The Comment shape MUST include `is_host: true` when the author is the user host, or an owner or admin of the club host, of the event the comment or its post belongs to, and `viewer.can_delete` per R-23. (US-6)
- R-23 `DELETE /comments/:id` MUST be allowed for the comment author, the author of the parent post, the host of the parent event, and admins; it MUST set `status: removed` on the comment and its replies. (US-6)
- R-24 Creating a comment MUST create a `comment` notification for the post author or event host, and for the parent comment author on a reply, never for the commenter themself (notifications.md). (US-5)
- R-25 When `META_APP_ID` or `META_CLIENT_TOKEN` is unset, `POST /posts` with `kind: instagram` MUST return 403 `not_enabled`; the flag is `instagram_posts` in `config/features.yml`. (US-2)

**Mobile**

- R-26 S17 MUST open from S08 and S09 with the occurrence preselected only when R-4 allows it; an upcoming occurrence MUST show the "photos go here" empty state and no Post button. (US-1)
- R-27 S17 opened from S07 MUST start with no occurrence and a Meet row that lists occurrences from the last 14 days where the user was going or checked in (`GET /me/rsvps?past=true`), and posting with no meet MUST be allowed. (US-1)
- R-28 S17 MUST use the iOS Photos picker with `selectionLimit: 10`, MUST upload each photo through `POST /uploads/direct` with a per-photo progress ring and a tap-to-retry on failure, MUST keep Post disabled until every photo has a `signed_id`, and MUST reject files over 15 MB or of another type before upload with the copy below. (US-1)
- R-29 S17 MUST show the caption field (1000 characters, counter from 900), the occurrence chip, an optional vehicle tag from the garage applied to every photo, and a per-photo spot tag that opens S18 with "Apply to all photos in this post" on by default for the first tag (spots.md). (US-1)
- R-30 The Post CTA MUST use the long-running primary CTA variant (`docs/components/primary-cta.md`) with stage copy "Uploading n of m" then "Posting"; on success the sheet closes and the origin screen shows the post to the author with a "Checking photos" label until `GET /posts/:id`, polled every 3 s for up to 60 s and again on next open, reports `visible`. (US-1, US-8)
- R-31 S19 MUST route a shared URL matching R-12 to S17 in Instagram mode with the URL filled, MUST route every other URL to the importer (import-from-link.md), and for a signed-out user MUST open S26 first and continue afterward. (US-2)
- R-32 S17 in Instagram mode MUST show the URL, caption, Meet row, and one spot tag, and MUST render the 422 `private`, 422 `unavailable`, 429, 409, and 403 `not_enabled` responses inline with the copy below, with "Open it" on 409 opening S16. (US-2)
- R-33 In every grid (S08, S09, S11, S15, feed) an Instagram item MUST render as a flat card with the Instagram glyph and `@author_handle` on `surface`, never an image, and tapping it MUST open S16. (US-3)
- R-34 S16 for an Instagram post MUST render the `html` from `GET /posts/:id/embed` in a WebView that loads `https://www.instagram.com/embed.js`, sized to `width` and `height` when both are returned and otherwise to width by 1.25 width until a measured height arrives from the page, with an "Open in Instagram" button that opens the canonical URL; 410 renders the unavailable card and 503 renders the retry card. (US-2, US-4)
- R-35 S16 for a photo post MUST show the photos at native aspect ratio with blurhash placeholders, the caption, the author row (opens S11), the occurrence chip (opens S09), a spot chip per tagged photo (opens S15), the vehicle chip, the first three comments with "See all comments" (opens S32), and an overflow with Share, Report, and, for the author, Change meet or spot and Delete. (US-4, US-7)
- R-36 S08 MUST show a photos block with the count and a 3 by 3 grid of the latest items from `GET /events/:slug/posts` with "See all" opening the full grid (S39, see Risks); S09 MUST show a Photos tab from `GET /occurrences/:id/posts`; S11 MUST show a Posts tab from `GET /users/:handle/posts`, and the owner's own hidden posts MUST appear there with the "Checking photos" or rejected label. (US-3, US-8)
- R-37 S32 MUST show top-level comments with replies indented one level, a Host badge from `is_host`, a composer with a 500 character counter, Reply on a comment, and a long press menu with Report, Block, Copy, and Delete when `viewer.can_delete`. (US-5, US-6)
- R-38 Posting and commenting MUST fail visibly when offline and MUST never be queued. (US-1, US-5)
- R-39 Share on an Instagram post MUST share only the web URL, and no client surface (story card S34, share preview) MAY render or copy an Instagram image. (US-2)

**Web**

- R-40 W13 for a photo post MUST server-render the photos, caption, author, occurrence link, spot links, and read-only comments with `noindex` and `og:image` set to the `lg` variant of the first photo; comment and post actions MUST open the app. (US-3, US-4)
- R-41 W13 for an Instagram post MUST render the oEmbed `html` with `embed.js` loaded once, MUST render the unavailable card on 410, and MUST set `og:image` to the flat brand placeholder. (US-2)
- R-42 W03 MUST show the same photos block as S08 with Instagram items as link cards, and its OG image MUST never use an Instagram post. (US-3)

**Admin and jobs**

- R-43 `ProcessPhotoJob` MUST retry three times with backoff, MUST report to Sentry on final failure, and MUST leave the post `hidden` with `safety_status: pending`. (US-8)
- R-44 `RecheckExternalMediaJob` MUST rerun the oEmbed check at 1, 10, and 60 minutes for rows with `checked_at: null`, then stop; the on-render rule in R-14 covers the rest. (US-2)
- R-45 `PurgePostMediaJob` MUST delete blobs and variants of `removed` posts 30 days after removal and MUST be idempotent. (US-7)
- R-46 Admin MUST be able to hide, remove, and restore posts and comments from A10 (moderation-and-safety.md). (US-8)

## Data

`posts` (including `safety_status`), `photos` (`image`, `width`, `height`, `blurhash`, `position`, `vehicle_id`, `spot_id`), `external_media` (`url`, `external_id`, `author_handle`, `spot_id`, `status`, `checked_at`), `comments`, `event_occurrences.photos_count`, `spots.photos_count` and `spots.last_photo_at` (spots.md), `blocks` (read for exclusions), `notifications` (`kind: comment`). Solid Cache entries `instagram_oembed/<url>` with a 24 h TTL. Feature flag `instagram_posts` and env `META_APP_ID`, `META_CLIENT_TOKEN` in `.env.example`.

## API

Read: `GET /posts/:id`, `GET /posts/:id/embed`, `GET /occurrences/:id/posts`, `GET /users/:handle/posts`, `GET /events/:slug/posts`, `GET /events/:slug/comments`, `GET /posts/:id/comments`, `GET /feed` (`recent_photos`), `GET /me/rsvps?past=true`.

Write: `POST /uploads/direct`, `POST /posts`, `PATCH /posts/:id`, `DELETE /posts/:id`, `POST /events/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id`.

Deltas: Post gains `safety_status` (author and admin only); Comment gains `is_host`; 422 `external_media_unavailable` carries `details.reason` in `private` or `unavailable`; 503 on `GET /posts/:id/embed` for transient oEmbed failures.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S17 | Post composer | `posts/new` (modal) / none | Pick photos, tag meet, car, spot, Post | upload progress, upload failed, too large, unsupported type, offline, signed-out, instagram private, instagram unavailable, instagram busy, already on curb, not enabled |
| S19 | Share intake | `share` / none | Continue to composer or importer | unsupported URL, signed-out |
| S16 | Post detail | `posts/[id]` / `/posts/:id` | Open author, meet, spot, comments, share, delete | loading, error, offline, hidden (author: checking, rejected), instagram loading, instagram unavailable, instagram retry, no longer listed |
| S32 | Comments | `meets/[slug]/comments`, `posts/[id]/comments` / section of `/meets/:slug` | Comment, reply, report, block, delete | loading, empty, error, offline (composer disabled), signed-out |
| S08 | Event detail, photos block | `meets/[slug]` / `/meets/:slug` | Open a post, See all, Post | upcoming empty, past empty, loading |
| S09 | Occurrence detail, Photos tab | `occurrences/[id]` / `/meets/:slug/:occurrenceId` | Open a post, Post | same as S08 |
| S11 | Profile, Posts tab | `u/[handle]` / `/u/:handle` | Open a post | empty, own hidden posts labeled |
| S02 | Home, Recent photos section | `(tabs)/index` / `/` | Open a post | omitted when empty |
| W13 | Post page | none / `/posts/:id` | Open in app | instagram unavailable, no longer listed (410) |

## Copy

| Where | String |
|---|---|
| S17 title | New post |
| S17 caption placeholder | Add a caption. Say where it was. |
| S17 meet row, none | Which meet? |
| S17 meet picker empty | No meets in the last 14 days. Mark yourself going or check in, and they show up here. |
| S17 vehicle tag | Tag your car |
| S17 vehicle tag, empty garage | Your garage is empty. Add what you drive. |
| S17 spot tag | Add a spot |
| S17 apply to all | Apply to all photos in this post |
| S17 Post CTA | Post |
| S17 stage copy | Uploading 2 of 5, Posting |
| S17 upload failed (per photo) | Didn't upload. Tap to retry. |
| S17 too large | That photo is over 15 MB. Pick a smaller one. |
| S17 unsupported type | curb takes JPEG, PNG, HEIC, and WebP. |
| S17 offline | You're offline. Posting needs a connection. |
| S17 instagram, not a post link | That isn't an Instagram post link. Share a post or reel from the Instagram app. |
| S17 instagram, private | That Instagram post is private. Make it public, or post the photo from your camera roll. |
| S17 instagram, unavailable | Couldn't find that Instagram post. It may have been deleted. |
| S17 instagram, busy | Instagram is busy. Try again in a few minutes. |
| S17 instagram, already on curb | This post is already on curb. |
| S17 instagram, not enabled | Sharing from Instagram isn't on yet. Post the photo from your camera roll. |
| S17 instagram, open existing | Open it |
| Author placeholder, checking | Checking photos. Usually under a minute. |
| Author placeholder, rejected | This post can't be shown. Read the guidelines, or email hello@curbsocial.club if you think this is wrong. |
| S08 upcoming empty | Photos go here after the meet. |
| S08 and S09 past empty | No photos from this one yet. Were you there? |
| S08 photos header | 24 photos |
| S08 see all | See all |
| S11 posts empty | No posts yet. |
| Feed section title | Recent photos |
| Instagram card, grid | @handle on Instagram |
| Instagram card, open | Open in Instagram |
| Instagram card, unavailable | This Instagram post is no longer available. |
| Instagram card, retry | Couldn't load this Instagram post. |
| Instagram card, retry CTA | Try again |
| S16 delete confirm | Delete this post? Its photos and comments go with it. |
| S16 delete CTA | Delete |
| S16 no longer listed | This post is no longer listed. |
| S32 empty, event | Ask the host something. Parking, rain plan, start time. |
| S32 empty, post | No comments yet. |
| S32 composer placeholder | Add a comment |
| S32 offline | Offline. Comments need a connection. |
| S32 host badge | Host |
| S32 delete confirm | Delete this comment? |
| W13 open in app | Open in curb to comment |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A signed-in user with three uploaded blobs and a past occurrence | `POST /posts` with `kind: photo` and the three blobs | 201, Post has `status: hidden`, `safety_status: pending`, three photos in position order | R-7, R-11 |
| AC-2 | The same user | `POST /posts` with 0 photos, then with 11 photos, then with a vehicle owned by another user | 422 `validation_failed` all three times with a `details` key naming the field | R-2, R-11 |
| AC-3 | An occurrence starting tomorrow in `America/Los_Angeles` | `POST /posts` attaching it | 422; the same call against an occurrence that started today at 7 am local returns 201 | R-4 |
| AC-4 | A photo post whose safety check passes | `ImageSafetyCheckJob` completes | `status: visible`, `event_occurrences.photos_count` incremented by the photo count, `GET /posts/:id` returns 200 without a token | R-5, R-7, R-15 |
| AC-5 | A hidden post | `GET /posts/:id` anonymously, then as the author | 404, then 200 with `status: hidden` and `safety_status` | R-15 |
| AC-6 | The URL validator test vectors | Run against both implementations | Accepted: `https://www.instagram.com/p/Cx1AbC_d-9/`, `http://instagram.com/p/Cx1AbC_d-9?igsh=abc`, `https://www.instagram.com/reel/Cx1AbC_d-9`; rejected: `https://www.instagram.com/curb.social/`, `https://www.instagram.com/stories/x/1/`, `https://www.instagram.com/tv/Cx1AbC_d-9/`, `https://instagr.am/p/Cx1AbC_d-9/`, `https://www.instagram.com/p/ab/`; the first two accepted forms normalize to the same canonical URL and the reel keeps its `/reel/` path | R-12 |
| AC-7 | VCR cassettes `instagram_oembed/ok.yml`, `private.yml`, `not_found.yml`, `timeout.yml`, `rate_limited.yml` | `POST /posts` with `kind: instagram` under each | 201 with `author_handle` and a cache entry; 422 `details.reason: private`; 422 `details.reason: unavailable`; 201 with `checked_at: null` and one enqueued `RecheckExternalMediaJob`; 429 with `Retry-After: 300` | R-13, R-25 |
| AC-8 | An Instagram post already on curb | `POST /posts` with the same shortcode via `www`, no `www`, and a query string | 409 `conflict` with `details.post_id` each time | R-12 |
| AC-9 | An `ok` Instagram post cached 1 h ago | `GET /posts/:id/embed` | 200 from cache with no outbound request (WebMock asserts zero) | R-14 |
| AC-10 | An `ok` Instagram post with `checked_at` 25 h ago and a `not_found.yml` cassette | `GET /posts/:id/embed` | 410, `external_media.status` is `unavailable`; a second call within 24 h returns 410 without an outbound request | R-14 |
| AC-11 | An `ok` post, cache expired, oEmbed times out | `GET /posts/:id/embed` | 503 with `Retry-After: 60`, `status` still `ok` | R-14 |
| AC-12 | A post by a user the viewer has blocked, on an occurrence with two other posts | `GET /occurrences/:id/posts` with the viewer's token | Two posts, the blocked user's absent; `photos_count` unchanged | R-18 |
| AC-13 | Two visible posts within radius from 3 days ago and one from 9 days ago | `GET /feed?near=` | `recent_photos` has two items, newest first | R-19 |
| AC-14 | A top-level comment C on an event hosted by user H | `POST /events/:id/comments` with `parent_id: C` by H, then a reply with `parent_id` pointing at that reply | 201 with `is_host: true`; then 422 | R-9, R-21, R-22 |
| AC-15 | A comment by user A on a post by user B, with replies | `DELETE /comments/:id` as a stranger, as B, as A | 403, then 200 with the comment and its replies `removed`, then 404 | R-23 |
| AC-16 | The author of a post with one photo | `PATCH /posts/:id` with `photos: [{ id, spot_id }]` and later `event_occurrence_id` of a future occurrence | 200 with the spot on the photo; then 422 | R-16 |
| AC-17 | A removed post | `GET /posts/:id`, `GET /posts/:id/comments`, and `PurgePostMediaJob` run 31 days later | 404 twice; blobs gone, job reruns without error | R-8, R-45 |
| AC-18 | Device, signed in, on a past occurrence in S09 | Tap Post, pick 5 photos, watch the rings, Post | Each ring completes, stage copy reads "Uploading n of 5" then "Posting", the sheet closes, S09 shows the post with "Checking photos", and it flips to the photos within a minute | R-28, R-30 |
| AC-19 | Device, Instagram app, one of the user's public posts | Share to curb, add a caption, Post, open S16 | S19 opens S17 in Instagram mode; S16 renders the embed in a WebView with the correct width and a measured height, and "Open in Instagram" opens the post in the Instagram app | R-31, R-34 |
| AC-20 | Device, an Instagram post made private after sharing | Open S16 after 24 h | The unavailable card with "Open in Instagram" | R-14, R-34 |
| AC-21 | Device, S08 of a meet with photos and an Instagram post | Scroll to the photos block | The grid mixes photo thumbnails and the flat Instagram card, header shows the combined count, tapping the card opens S16 | R-33, R-36 |
| AC-22 | W13 for an Instagram post and W03 for its meet, fetched with curl | The HTML is inspected | `og:image` on both points at a curb-hosted image, never `cdninstagram`; `noindex` on W13; `embed.js` script tag present once | R-41, R-42 |
| AC-23 | Device, signed in, airplane mode | Tap Post in S17 and Send in S32 | Both fail immediately with the offline copy and nothing is queued | R-38 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/posts_spec.rb spec/requests/api/v1/comments_spec.rb spec/requests/api/v1/uploads_spec.rb spec/models/post_spec.rb spec/models/comment_spec.rb` |
| oEmbed | `spec/services/external_media/oembed_spec.rb` with VCR cassettes under `spec/cassettes/instagram_oembed/` (AC-7, AC-9 to AC-11); WebMock asserts no request on cache hits |
| URL validator | `spec/services/external_media/instagram_url_spec.rb` and `pnpm --filter @curb/ui test instagramUrl` share the AC-6 vectors |
| Jobs | `spec/jobs/process_photo_job_spec.rb` (EXIF absent on output, variants present), `spec/jobs/recheck_external_media_job_spec.rb`, `spec/jobs/purge_post_media_job_spec.rb` |
| Feed | `spec/requests/api/v1/feed_spec.rb` covers AC-13 |
| Mobile | Manual on a physical iPhone in Marine Layer light and dark: AC-18 to AC-21, AC-23. Maestro flow `post_photos.yaml` once flows exist. The Instagram share test needs the Meta app in development mode with the tester's account added. |
| Web | `pnpm --filter @curb/web test` Playwright on `/posts/:id` asserting AC-22 |
| Design | Figma page "iOS Screens", frames "Post composer", "Post detail", "Comments" (Phase 4 design pass); flat rendering check per design-system-and-theming.md; the Instagram card must read as content, not a glass surface |

## Risks and open questions

- Meta app dependency (ADR 0011): oEmbed needs a Meta app with the oEmbed Read feature. Development mode serves app testers only; Meta App Review must pass before external TestFlight. Default: build behind `instagram_posts`, add testers to the Meta app in Phase 4, submit App Review at the start of Phase 5. If review slips, launch with the flag off and the not-enabled copy.
- Instagram post ownership cannot be verified without Instagram Login. Default: anyone can share a public post; the `copyright` report reason and A10 removal cover misuse.
- Instagram oEmbed often returns `height: null`; the WebView height must come from the page. Default: 1.25 aspect until `embed.js` posts a `MEASURE` message; fall back to `document.body.scrollHeight` on load.
- Adopted 2026-09-06 into docs/data-model.md: add `posts.safety_status text default 'pending'` (`pending`, `passed`, `rejected`) so the author can tell "checking" from "rejected".
- Adopted 2026-09-06 into docs/api.md: add `GET /events/:slug/posts` (visible posts across the event's occurrences, same shape as `GET /occurrences/:id/posts`); add `past=true` to `GET /me/rsvps` (last 14 days, going or checked in); add `is_host` to the Comment shape; add 503 `service_unavailable` to the error table; add a 60 per hour comment rate limit.
- Adopted 2026-09-06 into docs/screens.md: add S39 Event photos, `meets/[slug]/photos`, Phase 4, spec photos-and-posts, as the full grid behind "See all".
- Adopted 2026-09-06 into docs/data-model.md: `events.comments_count` counter cache, since the Event shape already returns `comments_count`.
- Text posts (`kind: text`) have no composer entry in this phase. Default: reject at the API until a later spec adds them.
- Heavy WebViews in lists are avoided by R-33; if a grid of Instagram cards feels empty, revisit with a thumbnail-free card design rather than storing images.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 | `posts`, `photos`, `external_media`, `comments` models, validations, counters, `ProcessPhotoJob`, `PurgePostMediaJob`, safety hook stub, factories | R-1 to R-9, R-43, R-45 | AC-3 (model), AC-4, AC-17 |
| 2 | Photo post endpoints, uploads, visibility rules, list endpoints, rswag specs, `GET /events/:slug/posts` | R-10, R-11, R-15 to R-18 | AC-1, AC-2, AC-5, AC-12, AC-16 |
| 3 | Instagram URL validator (Ruby and `packages/ui`), oEmbed client with cassettes, `kind: instagram` create, embed endpoint, recheck job, feature flag | R-12 to R-14, R-25, R-44 | AC-6 to AC-11 |
| 4 | Comments endpoints, host badge, delete rules, notification hook, rate limit | R-20 to R-24 | AC-14, AC-15 |
| 5 | `recent_photos` feed section, `GET /me/rsvps?past=true`, profile posts | R-19, R-27 (API) | AC-13 |
| 6 | S17 photo mode: picker, uploads with progress, caption, meet row, vehicle and spot tags, long-running CTA, checking placeholder | R-26 to R-30, R-38 | AC-18, AC-23 |
| 7 | S19 Instagram routing, S17 Instagram mode, embed card, S16 for both kinds | R-31 to R-35, R-39 | AC-19, AC-20 |
| 8 | Photo grids on S08, S09, S11, S39, feed section card, S32 comments | R-36, R-37 | AC-21, AC-23 |
| 9 | W13 for both kinds, W03 photos block, OG rules | R-40 to R-42 | AC-22 |
