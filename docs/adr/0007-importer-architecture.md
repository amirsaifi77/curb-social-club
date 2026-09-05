# ADR 0007: Pluggable importer with LLM fallback

Date: 2026-09-05. Status: Accepted.

## Context

The signature feature is pasting a link (Evite first) and getting a draft event. Sources differ wildly: some have APIs, some have JSON-LD, some have only OpenGraph tags and free text, and flyers are images. Sources change markup without notice. Some sources have restrictive terms. The feature must degrade gracefully and never block the user from publishing manually.

## Decision

An asynchronous pipeline: `Import` record, `ImportJob` on Solid Queue, an adapter registry that selects one adapter per URL, a normalized `DraftEvent` value object with per-field confidence, and an LLM structured-output extractor as a fallback when required fields are missing or low confidence. The client polls the import (or gets a push) and edits the draft before publishing. Full detail in `docs/importer.md`.

Adapters implement a small interface (`matches?`, `fetch`, `parse`, `llm_fallback_allowed?`). Cross-cutting concerns (HTTP cache, per-host throttle, robots check, retries, size and time limits) live in one `Fetcher` so adapters stay thin. Every fetch is a single, user-initiated request for the pasted URL; there is no crawling and no authenticated fetching.

Launch adapters: Evite, Eventbrite, Meetup, Partiful, Instagram (OG plus LLM), Flyer OCR, Generic OG. Facebook is out of scope until a compliant path exists.

## Alternatives

| Option | Why not |
|---|---|
| Synchronous parsing in the request | Fetch plus LLM can take 10 to 20 seconds; mobile requests would time out and retries would double-fetch. |
| LLM for everything, no adapters | Costly, slower, and less accurate than JSON-LD or an API when they exist. Structured sources should be deterministic. |
| Adapters only, no LLM | Instagram captions and flyers have no structure; the fallback is what makes those sources work at all. |
| Third-party scraping service (Diffbot, Apify) | Another vendor, recurring cost, and still needs normalization. Could back a single adapter later. |
| Headless browser (Playwright) for JS-rendered pages | Heavy to run on Render workers. Start without it; add a Browserless-style service behind the `Fetcher` only if a high-value source requires it. |

## Consequences

Positive: adding a source is one class and a cassette. Confidence scores make the review UI honest. Raw payload retention lets us re-parse after fixes.

Negative: markup drift breaks adapters silently unless monitored; the quarterly health check job addresses this. LLM cost and latency are bounded by rate limits and caching but not zero. ToS exposure on Instagram and Partiful is managed by fetching only what a link preview would fetch and by linking back to the source, but it is a judgment call that Amir should confirm.
