# ADR 0011: Instagram photos by share sheet and oEmbed, never stored

Date: 2026-09-06. Status: Accepted.

## Context

Enthusiasts already post their meet photos on Instagram and do not want to upload the same images a second time. Instagram's Basic Display API, the only read path for personal accounts, was fully sunset in September 2025. The remaining official API (Instagram API with Instagram Login) serves Business and Creator accounts only, needs Meta App Review for third-party access, and gives nothing for personal accounts. Meta's terms prohibit automated collection and storing Instagram media. The gaps doc (item 14) already rules out fetching Meta pages and storing Meta images.

The iOS Photos picker is the honest baseline: the same photo is on the camera roll, so posting it to curb is one tap and no re-upload friction exists in practice.

## Decision

Two ways to put a photo on curb, both in the MVP:

1. Photos picker. The user picks up to ten images from the camera roll; they upload to R2 through Active Storage direct upload, EXIF is stripped, variants and a blurhash are generated. This is the primary path and the only path that produces images curb owns copies of.
2. Share from Instagram. The user opens the iOS share sheet on one of their Instagram posts and picks curb. The share extension receives the post URL. curb creates a post of kind `instagram` that stores the canonical URL, the author handle, and the shortcode, and renders the post through Instagram's oEmbed endpoint (app-level token, public posts only). The oEmbed response is cached in Solid Cache for 24 hours and the image bytes are never written to R2 or the database. If the post is private or later deleted, the card shows an unavailable state and links out.

Instagram posts can be attached to an occurrence, a spot, or neither, exactly like photo posts. They count toward the event's photo grid but render as an embed card, and they are excluded from OG images, story cards, and any surface that would copy the image.

Instagram Login (Business and Creator accounts) is specified as a post-launch option and is not built before launch.

## Alternatives

| Option | Why not |
|---|---|
| Instagram Login to pick from a connected account's media | Personal accounts cannot use it; App Review is required; still forbids storing media in ways that matter. Worth adding for photographers with Creator accounts, after launch. |
| Fetch the post page and extract the image | Prohibited by Meta's terms and blocked technically. Never. |
| Ask the user to screenshot the post | Works today with the Photos picker path and needs nothing from us. |
| Skip Instagram entirely | The share-sheet path is cheap (the share extension already exists for link import) and it makes existing photos discoverable on curb without copying them. |

## Consequences

Positive: no Meta media stored, no scraping, one code path (the share extension) serving both import and photo sharing, and an honest answer for personal accounts.

Negative: Instagram posts disappear from curb when the source is deleted or made private; the embed needs a WebView on mobile and Instagram's embed script on web; the oEmbed Read feature must be added to a Meta app and approved through App Review before external TestFlight (works in development mode for app testers until then). The share extension must route Instagram post URLs to the photo flow and every other URL to the importer.
