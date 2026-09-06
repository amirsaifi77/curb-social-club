# Spec: Import from link

Status: draft. Phase: 3. Last updated: 2026-09-06.
Depends on: create-and-host-tools.md (S20 controls, `POST /events`, duplicate rules), events-and-occurrences.md, event-detail-and-rsvp.md (source attribution block), notifications.md (`import_ready`), photos-and-posts.md (S19 routing for Instagram post URLs), auth-and-accounts.md (S26). Related decisions: ADR 0007, ADR 0011, gaps items 13 to 17.

## Summary

The signature feature: a host pastes a link, shares one from another app, or photographs a flyer, and gets a draft meet with the date and place already filled in. The pipeline in `docs/importer.md` does the work; this spec fixes the client behavior, the adapter order and limits, the constraints for Evite and Meta sources (paste or share text only, no server fetch, no stored images), the draft editor with honest per-field confidence, and the eval set that decides whether the feature is good enough. The original link stays on the event so curb links out instead of replacing the source.

## User stories

| Id | Story |
|---|---|
| US-1 | As a host, I want to paste an Evite or event link and get a draft so that listing on curb takes less typing than posting anywhere else. |
| US-2 | As a host, I want to share a link straight from Safari or the Evite app into curb so that I never have to copy it. |
| US-3 | As a host, I want to see which fields curb is unsure about, and why, so that I fix the right ones before posting. |
| US-4 | As a host, I want to paste the invite text when a site cannot be read so that the import still works. |
| US-5 | As a host, I want to photograph a paper flyer or pick a screenshot so that a flyer becomes a listing. |
| US-6 | As a member, I want an imported meet to credit and link its source so that the original community is not replaced. |
| US-7 | As the builder, I want a repeatable measure of import quality so that adapter changes do not regress silently. |

## Scope

In Phase 3, first half: entry on S06 (paste field, clipboard detection, camera and photo buttons), S19 share intake for non-Instagram URLs, `POST /imports`, polling, retry, the staged progress, adapters in this order: Evite (paste or share text), generic Open Graph plus page text, paste-text fallback; the LLM extractor with cost controls; geocoding and venue candidates; S24 draft editor with confidence, snippets, locked attribution, publish gating, and duplicate check; the eval set of 30 links in CI; raw payload retention.

In Phase 3, second half, in order and only as time allows: Eventbrite, Meetup, Partiful, Instagram caption (paste only), flyer OCR (on-device Vision text plus the image as draft cover candidate).

Not in this phase: Facebook (paste text only, never a fetch, Later); server-side OCR (web fallback, Phase 7 with W17); web import at `/imports/:id` (Phase 7); Instagram post URLs from the share sheet (post composer, photos-and-posts.md, Phase 4); automated claim of an imported meet (create-and-host-tools.md handles the claim); headless browser fetching (never before a high-value source needs it, ADR 0007).

## Requirements

**Data**

- R-1 An import MUST write `imports` with `user_id`, `source_url` or `source_text` or `flyer` (at least one), `source_type` after registry match, `status`, `raw_payload`, `parsed_payload` (DraftEvent JSON), `used_llm`, `duration_ms`, and on failure `error_code` and `error_message`. (US-1)
- R-2 `imports.raw_payload` MUST be purged by a nightly `PurgeImportPayloadsJob` after 30 days; `parsed_payload` MUST be kept. (US-7)
- R-3 Publishing MUST set `imports.status: published`, `imports.event_id`, and `events.import_id`, `source_url`, `source_type`, and `external_host_name`, and MUST write the final confidence map and the `edited_fields` list into `parsed_payload`. (US-6, US-7)
- R-4 No image from an Evite, Instagram, or Facebook source MUST ever be written to R2 or the database; an imported event MUST have no `cover` attachment until the host uploads one or confirms rights on an `og:image` from a non-Meta, non-Evite source (gaps item 15). (US-6)

**Fetcher and adapters**

- R-5 Every fetch MUST be a single request for the exact URL the user pasted plus at most its `og:image`, with no crawling, pagination, login, cookies, or authenticated session. (US-1)
- R-6 The Fetcher MUST apply, in order: Solid Cache lookup keyed by normalized URL (6 h), per-host token bucket (1 request per 2 s, 60 per hour), `robots.txt` check for the user agent `CurbSocialClubBot/1.0 (+https://curbsocial.club/bot)`, retry twice on 5xx or timeout and never on 4xx, redirects up to 5 (same site or known short-link hosts only), a 2 MB body limit, and a 10 s timeout. (US-1)
- R-7 `EviteAdapter` and `InstagramAdapter` MUST NOT fetch (`fetch` returns nil), MUST parse `imports.source_text` only, and MUST fail with `error_code: unsupported` and no request made when `source_text` is absent (gaps items 13 and 14). (US-1, US-4)
- R-8 `Importers::Registry::ADAPTERS` MUST be `[EviteAdapter, EventbriteAdapter, MeetupAdapter, PartifulAdapter, InstagramAdapter, FlyerOcrAdapter, PasteTextAdapter, GenericOgAdapter]`, MUST pick the first whose `matches?` is true, and MUST fall back to `GenericOgAdapter` for any `http` or `https` URL and to `PasteTextAdapter` when only `source_text` is present. (US-1, US-4)
- R-9 Every adapter MUST return a `DraftEvent` with a `confidence` entry for every non-nil field and a `snippets` entry (the source text the value came from, 200 chars) for `title`, `starts_at`, `ends_at`, `rrule`, `venue_name`, `address`, and `host_name`, and MUST never raise on missing fields. (US-3)
- R-10 Confidence MUST follow `docs/importer.md`: API or JSON-LD 0.95, embedded state 0.9, OpenGraph 0.8 (title, image) or 0.6 (description), regex over text 0.5 to 0.7, LLM as reported capped at 0.85, geocoder 0.9 (rooftop single match) or 0.6. (US-3)
- R-11 The LLM extractor MUST run only when a required field (`title`, `starts_at`, `location` or `address`) is missing or under 0.7 and the adapter allows it; MUST use structured output with the schema in `docs/importer.md`, temperature 0, input truncated to 8k tokens; MUST include today's date, the default region, and adapter hints in the prompt; and MUST merge by the rule adapter wins at or above 0.8, else higher confidence wins, ties keep the adapter. (US-1, US-3)
- R-12 LLM calls MUST be cached in Solid Cache for 7 days keyed by SHA256 of the input text plus the prompt version (so a repeated URL inside the 6 h fetch cache never re-runs the model), MUST set `imports.used_llm`, and the whole job MUST fail with `timeout` at 60 s (fetch 10 s, parse 5 s, LLM 20 s). (US-7)
- R-13 Geocoding MUST run when the draft has an `address` but no `location`, MUST cache 30 days, and MUST populate `venue_candidates` (existing venues within 100 m by trigram name similarity, up to 3) without picking one. (US-3)
- R-14 Recurrence MUST be returned as a `rrule` suggestion with its snippet and MUST never be applied to the draft's `rrule` by the server or auto-applied by the client. (US-3)

**API**

- R-15 `POST /imports` MUST accept `{ source_url?, source_text?, flyer_blob_id?, ocr_text? }` with at least one of `source_url`, `source_text`, `flyer_blob_id`, MUST return 202 with Import, MUST return the existing import for the same `(user_id, source_url)` within one hour, MUST return 422 `validation_failed` with `details.source_text` when the URL matches a no-fetch adapter and `source_text` is absent or under 40 chars after URLs are removed, and MUST be rate limited to 20 per user per hour. (US-1, US-4)
- R-16 `GET /imports/:id` MUST return 404 to anyone but the owner, MUST return the Import with `draft` when `status` is `ready` or `published`, and MUST include `duplicate_of` (EventSummary or null) computed by `source_url` match when ready. (US-1, US-6)
- R-17 `POST /imports/:id/retry` MUST accept `{ force_llm?, source_text? }`, MUST reset the import to `queued` keeping the same id, and MUST return 202. (US-4)
- R-18 `POST /events` with `import_id` MUST require the import to belong to the user and be `ready`, MUST reject (422) a body whose `source_url` differs from the import's, MUST accept `edited_fields[]` and `cover_rights_confirmed`, and MUST return 409 `conflict` with `details.duplicate_of` on a `source_url` match or the near match in create-and-host-tools.md R-15 unless `force: true`. (US-6)
- R-19 `import_ready` MUST be enqueued (notifications.md) when the job finishes and the import's `GET /imports/:id` has not been polled for 5 s. (US-1)

**Mobile**

- R-20 S06 MUST show the paste field, MUST check the clipboard on focus of the tab with `expo-clipboard` `hasUrlAsync` so the iOS paste banner appears only once and only when a URL is present, MUST show a "Use this link?" chip when one is, and MUST show camera and photo buttons that lead to the flyer path. (US-1, US-5)
- R-21 S19 MUST receive the shared URL and text, MUST route an Instagram post URL (`instagram.com/p/`, `/reel/`) to the post composer per photos-and-posts.md (until Phase 4: the unsupported state), MUST route every other URL to `POST /imports` with `source_text` set to the shared text, and MUST open S26 first when signed out. (US-2)
- R-22 The client MUST classify the URL before posting with a shared helper in `packages/ui` (`importSourceFor(url)` returning `kind` and `needsText`) and MUST show the paste-text box before `POST /imports` when `needsText` is true. (US-4)
- R-23 S24 MUST poll `GET /imports/:id` every 2 s for up to 60 s, MUST drive the long-running PrimaryButton with stage copy from `status` (`queued` and `fetching`: Reading link, or Reading your text for text sources; `parsing`: Finding the date; `extracting`: Finding the place; then Drafting your event), and MUST show retry after 60 s. (US-1)
- R-24 S24 MUST render the preview card above a field list where each field shows filled (at or above 0.7), half (0.5 to 0.7), outline (under 0.5), or Not found; fields under 0.7 MUST be expanded by default with their snippet in small text. (US-3)
- R-25 Tapping a field MUST open the same control S20 uses; a date field MUST show the parsed value beside the original snippet; the address MUST geocode and show the pin, offering `venue_candidates` first and a manual pin on failure. (US-3)
- R-26 A recurrence suggestion MUST render as a chip ("Repeat every Saturday?") that applies only on tap. (US-3)
- R-27 The Source block MUST be locked (URL, platform, author handle when known), MUST allow correcting the host name only, and MUST never be removable on an imported event. (US-6)
- R-28 Post MUST be disabled until `title`, `starts_at`, and `location` are each at or above 0.5 or were edited, and on a 409 the client MUST show the duplicate sheet from create-and-host-tools.md R-28. (US-3, US-6)
- R-29 The cover slot MUST show the flat branded placeholder; when the draft has a `cover_image_url` from a non-Meta, non-Evite source it MUST show it as a candidate with a rights confirmation, and confirming MUST send `cover_rights_confirmed: true` so `ImportCoverJob` fetches it once after publish. (US-6)
- R-30 The flyer path MUST run on-device OCR with Apple Vision, MUST upload the image through `POST /uploads/direct`, MUST post `flyer_blob_id` and `ocr_text`, and MUST offer the flyer image as the cover candidate without a rights prompt. (US-5)
- R-31 `failed` MUST show the copy for `error_code`, a Paste text action that calls `POST /imports/:id/retry` with `source_text`, and a Fill it in by hand action opening S20 prefilled with any fields found. (US-4)
- R-32 Offline MUST disable the paste field and buttons with the offline copy; a queued import is never retried automatically. (US-1)

**Web**

- R-33 None in this phase: `/new` and `/imports/:id` are W17 in Phase 7; W03 renders the source block from web.md. (US-6)

**Admin and jobs**

- R-34 `ImportJob` MUST move `status` through `queued`, `fetching`, `parsing`, `extracting` (when the LLM runs), `ready` or `failed`, updating the row at each step so polling shows progress. (US-1)
- R-35 `AdapterHealthCheckJob` MUST run quarterly, re-fetch one known public URL per fetching adapter, and report to Sentry when fewer fields parse than the cassette baseline. (US-7)
- R-36 `bin/rails importer:eval` MUST run the 30-entry eval set with VCR cassettes for HTTP and LLM calls, MUST print per-adapter pass rates, and MUST exit non-zero when Evite or generic falls under 70 percent; CI MUST run it on any PR touching `apps/api/app/services/importers/**`, and a weekly scheduled workflow MUST run it live and report to Sentry. (US-7)

## Data

`imports` (all columns, including `source_text`), `events.import_id`, `source_url`, `source_type`, `external_host_name`, `cover`, `venues` (candidates by trigram within 100 m), Solid Cache entries for fetch (6 h), LLM (7 d), geocode (30 d). No Meta or Evite image bytes anywhere (R-4).

## API

Uses `POST /imports`, `GET /imports/:id`, `POST /imports/:id/retry`, `POST /events` (with `import_id`), `POST /uploads/direct`, `GET /venues/search` (from the S20 controls).

Deltas this spec assumes (see Risks): `source_text` on `POST /imports` and `imports`; `duplicate_of` on Import; `snippets`, `rrule_suggestion`, and `venue_candidates` on DraftEvent; `edited_fields[]` and `cover_rights_confirmed` on `POST /events`; `source_text` on `POST /imports/:id/retry`.

Error codes and their copy (stored in `imports.error_code`, rendered by S24):

| Code | When | Copy |
|---|---|---|
| `login_required` | The page redirected to a sign-in | That page needs a login. Paste the text instead, or fill it in by hand. |
| `not_found` | 404 or 410 | That link didn't load. Check it and try again. |
| `blocked_by_robots` | `robots.txt` disallows the path | That site doesn't let us read it. Paste the text instead. |
| `unsupported` | No-fetch source without text, or a non-http scheme | We can't read that kind of link yet. Paste the text instead, or fill it in by hand. |
| `timeout` | Any stage over its limit | That page took too long. Try again, or paste the text. |
| `parse_failed` | No `title` or no `starts_at` after the LLM | We couldn't find a date or place in that. Fill in what's missing. |
| HTTP 429 on `POST /imports` | 20 per hour | You've hit 20 imports this hour. Try again at {time}. |

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S06 | Create (tab), import entry | `(tabs)/new` / `/new` (7) | Import, camera, photo | empty (examples), clipboard URL detected, needs text, signed-out, offline |
| S19 | Share intake | `share` / none | Import | routing, unsupported URL, signed-out, offline |
| S24 | Import draft editor | `imports/[id]` / `/imports/:id` (7) | Post event, Paste text, Fill it in by hand | fetching stages, timed out, ready, paste text fallback, duplicate found, failed (per code), posting, error, offline |

## Copy

| Where | String |
|---|---|
| S06 field placeholder | Paste a link or drop a flyer. |
| S06 examples (empty) | Works with Evite, Eventbrite, Meetup, Partiful, and most public pages. For Evite and Instagram, paste the invite text. |
| S06 clipboard chip | Use this link? |
| S06 buttons | Import, Take a photo of a flyer, Pick a screenshot |
| S06 needs text, title | Paste the invite text |
| S06 needs text, helper | Evite and Instagram don't let apps read their pages. Copy the invite text and paste it here. The link stays as the source. |
| S06 offline | You're offline. Importing needs a connection. |
| S19 title | Add to curb |
| S19 unsupported (Instagram, before Phase 4) | Instagram posts come to curb in a later update. To list a meet from a caption, paste the caption in the Create tab. |
| S24 stages | Reading link / Reading your text / Finding the date / Finding the place / Drafting your event |
| S24 timed out | Still working on that link. (Keep waiting / Paste the text instead) |
| S24 ready header | Looks right? Fix anything we got wrong, then post. |
| S24 indicator labels (VoiceOver) | Confident, Check this, Guess, Not found |
| S24 snippet prefix | From the page: "{snippet}" |
| S24 date row | {Sat, Oct 4, 7:00 am} from "{this saturday 7-10}" |
| S24 recurrence chip | Repeat every Saturday? |
| S24 venue candidate | Already on curb: {venue name}, {distance} away. (Use it) |
| S24 geocode failed | We couldn't place that address. Drop the pin. |
| S24 source block | Source: {platform}. Posted by {handle}. Stays on the listing. |
| S24 cover placeholder | No photo yet. Add one from last time, or post without. |
| S24 cover rights | Use the photo from {platform}? Only if you have the right to. (Use it / Skip) |
| S24 post disabled hint | Check the title, date, and place before posting. |
| S24 duplicate | Already listed? {title} at {venue}, {day} {time}, came from the same link. (Open it instead / List anyway) |
| S24 failed actions | Paste the text / Fill it in by hand |
| S24 rate limited | see error table |
| S24 success | Listed. People within 20 miles can see it now. (Share / Claim this meet as host / Done) |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A signed-in member | `POST /imports { source_url: "https://example.org/meet" }` twice within an hour | 202 both times with the same `id`; a job is enqueued once | R-1, R-15 |
| AC-2 | An Evite URL and no text | `POST /imports { source_url }` | 422 with `details.source_text`; no HTTP request was made (WebMock asserts zero requests) | R-7, R-15 |
| AC-3 | An Evite URL plus 300 chars of pasted invite text (cassette `evite_text_01`) | The job runs | `source_type: evite`, `status: ready`, `title` and `starts_at` at or above 0.5 with snippets, `cover_image_url` nil, zero outbound requests | R-4, R-7, R-9, R-34 |
| AC-4 | A generic page with JSON-LD `Event` (cassette `generic_jsonld_01`) | The job runs | `title` and `starts_at` at 0.95, `used_llm` false, one request in the cassette | R-5, R-8, R-10, R-11 |
| AC-5 | A generic page with only OG tags and free text (cassette `generic_og_02` plus LLM cassette) | The job runs | `extracting` status was written, `used_llm` true, LLM fields capped at 0.85, merge keeps the OG title at 0.8 | R-10 to R-12, R-34 |
| AC-6 | A 3 MB page, a 12 s page, a page whose `robots.txt` disallows the path, and a page redirecting to `/login` | Four jobs run | `failed` with `timeout`, `timeout`, `blocked_by_robots`, `login_required` respectively; the throttle key for the host was consumed once each | R-6, R-34 |
| AC-7 | Any adapter test | `Registry.for` is called with an Evite, Eventbrite, Meetup, Partiful, Instagram, unknown, and text-only source | Returns the matching adapter, `GenericOgAdapter`, and `PasteTextAdapter` in that order | R-8 |
| AC-8 | A draft with an address and no location, near an existing venue | The job runs | `location` set with geocoder confidence, `venue_candidates` has one entry, `rrule` nil and `rrule_suggestion` present when the text says "every Saturday" | R-13, R-14 |
| AC-9 | A ready import and a published event with the same `source_url` | `GET /imports/:id`, then `POST /events { import_id }` without `force` | `duplicate_of.slug` set; 409 with the same slug | R-16, R-18 |
| AC-10 | A ready import owned by another user | `GET /imports/:id`, `POST /events { import_id }` | 404, then 422 | R-16, R-18 |
| AC-11 | A ready import from a generic page with `cover_image_url` | `POST /events { import_id, edited_fields: ["starts_at"], cover_rights_confirmed: true }` | 201; `imports.status: published`, `parsed_payload.edited_fields` equals the list, `ImportCoverJob` enqueued; without `cover_rights_confirmed` no job and no `cover` | R-3, R-4, R-29 |
| AC-12 | A failed import | `POST /imports/:id/retry { source_text }` | 202, same id, status `queued`, the next run uses `PasteTextAdapter` or the URL's no-fetch adapter | R-17 |
| AC-13 | The eval manifest with 30 entries | `bin/rails importer:eval` in CI (VCR record mode `none`) | Prints per-adapter rates; passes at Evite and generic at or above 70 percent; a deliberate confidence regression fixture fails the run | R-36 |
| AC-14 | Each fetching adapter | Its spec runs | At least three VCR cassettes per adapter with PII scrubbed, asserting fields and confidences; no live HTTP in CI | R-9, R-10, R-35 |
| AC-15 | A `raw_payload` older than 30 days | `PurgeImportPayloadsJob` runs | `raw_payload` null, `parsed_payload` intact | R-2 |
| AC-16 | Device, a URL on the clipboard | The Create tab is opened | The iOS paste banner shows once, the "Use this link?" chip appears, tapping it fills the field | R-20 |
| AC-17 | Device, Safari on a public Eventbrite page | Share to curb | S19 posts the import and S24 shows the stages in order, then the field list with indicators and expanded low-confidence rows | R-21, R-23, R-24 |
| AC-18 | Device, an Instagram post URL shared | Share to curb | S19 shows the unsupported copy (Phase 3) or opens the post composer (Phase 4) | R-21 |
| AC-19 | Device, S24 with `starts_at` at 0.4 | Post is tapped, then the date is edited | Post is disabled with the hint, then enabled; the date row shows the snippet | R-25, R-28 |
| AC-20 | Device, a printed flyer | Take a photo of a flyer | OCR text is posted with the blob, the draft fills, the flyer is offered as the cover without a rights prompt | R-30 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/imports_spec.rb spec/services/importers/ spec/jobs/import_job_spec.rb spec/jobs/purge_import_payloads_job_spec.rb` |
| Eval | `cd apps/api && bin/rails importer:eval` (cassettes under `spec/fixtures/importer/`, manifest `spec/fixtures/importer/eval/manifest.yml`) |
| Mobile | Manual on a physical iPhone in Marine Layer light: AC-16 to AC-20. Maestro flow `import_link.yaml` against staging with a fixed public page |
| Design | Figma page "iOS Screens", frames "Import entry", "Import draft"; confidence indicators and the long-running PrimaryButton per `docs/components/primary-cta.md` |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md and docs/api.md: add `imports.source_text` (text, 20k chars) and accept `source_text` on `POST /imports` and `POST /imports/:id/retry`. Gaps items 13 and 14 make text the only lawful input for Evite and Meta, and `ocr_text` should stay what it says.
- Adopted 2026-09-06 into docs/api.md: DraftEvent gains `snippets` (field to string), `rrule_suggestion` (string or null), and `venue_candidates` (up to 3 `{ id, name, distance_m }`); Import gains `duplicate_of`; `POST /events` gains `edited_fields[]` and `cover_rights_confirmed`.
- Adopted 2026-09-06 into docs/importer.md and docs/architecture.md 3.7: `EviteAdapter` is a text adapter, not an embedded-state parser, and `InstagramAdapter` never fetches. The registry gains `PasteTextAdapter`. Default: this spec wins; the pipeline docs should be corrected in the same PR as slice 1.
- Gaps item 13: even a device-side OG preview of an Evite page needs a lawyer's confirmation. Default: none is made; the client asks for text.
- Gaps item 16: LLM vendor is a config value. Default: Anthropic structured output behind `Importers::LlmExtractor`; budget alert at $30 per month from the provider console.
- Gaps item 17: Eventbrite forbids storing past events and requires attribution; the source block satisfies attribution, and the materializer's history retention does not apply to a one-off import. Default: Eventbrite adapter uses the v3 API with an app token and stores only the DraftEvent.
- The share extension cannot reliably tell whether an Evite share carries the invite text or just a title. Default: R-15's 40-char rule decides; the client shows the paste box when the server returns 422.
- Eval set composition: 12 Evite text samples, 12 generic pages, 6 spread across the second-half adapters, all PII scrubbed and stored in the repo. Real links go stale; the weekly live run is what catches that, not CI.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 | `Import` model with `source_text`, `Fetcher` with all middleware, `Registry`, `BaseAdapter`, `DraftEvent` with snippets, `ImportJob` status writes, `PurgeImportPayloadsJob`, `POST /imports`, `GET /imports/:id`, rswag specs | R-1, R-2, R-5, R-6, R-8, R-9, R-15, R-16, R-34 | AC-1, AC-6, AC-7, AC-15 |
| 2 | `EviteAdapter` (text), `PasteTextAdapter`, `GenericOgAdapter` with JSON-LD, OG, and text regexes; cassettes | R-7, R-10 | AC-2, AC-3, AC-4, AC-14 |
| 3 | `LlmExtractor` with schema, cache, merge rule, and `extracting` status; geocoding with `venue_candidates` and `rrule_suggestion` | R-11 to R-14 | AC-5, AC-8 |
| 4 | `POST /events` with `import_id`, `edited_fields`, `cover_rights_confirmed`, `ImportCoverJob`, `duplicate_of`, retry endpoint, `import_ready` hook | R-3, R-4, R-17 to R-19 | AC-9 to AC-12 |
| 5 | Eval harness: manifest, 30 fixtures, rake task, CI job, weekly live workflow, `AdapterHealthCheckJob` | R-35, R-36 | AC-13 |
| 6 | S06 import entry with clipboard, needs-text box, offline; `importSourceFor` helper; S19 routing and signed-out | R-20 to R-22, R-32 | AC-16, AC-18 |
| 7 | S24: polling, stages, field list with indicators and snippets, edit controls from S20, recurrence chip, venue candidates, source block, cover slot, gating, duplicate sheet, failed states | R-23 to R-29, R-31 | AC-17, AC-19 |
| 8 (second half) | `EventbriteAdapter` (API), `MeetupAdapter` (JSON-LD), cassettes | R-8, R-10 | AC-14 for both |
| 9 (second half) | `PartifulAdapter`, `InstagramAdapter` (caption text), cassettes and manifest entries | R-7, R-8 | AC-14 |
| 10 (second half) | Flyer path: Vision OCR module, upload, `FlyerOcrAdapter`, cover candidate | R-30 | AC-20 |
