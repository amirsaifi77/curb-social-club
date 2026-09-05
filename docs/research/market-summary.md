# Market Research Summary

Full report: `research/market-research.md` (2026-09-05).

## Key takeaways

1. No system of record exists. SoCal meets live on Instagram plus a Facebook page, get mirrored (late, sometimes wrong) onto volunteer directories like iDriveSoCal, and spread by group chat and "any shows this weekend?" posts in regional Facebook groups.

2. No dedicated app has won. Ryvve, Car Hangout, Throdle and Strada are solo-developer apps with under 50 ratings each and empty maps outside their home region. Watch carsandcoffee.com, pre-launching on the exact-match domain.

3. The name is exposed, not blocked. Cars and Coffee, Inc. holds one live registration (clothing). Its event-services filings were refused and abandoned; others had to disclaim "cars & coffee." The USPTO treats the phrase as descriptive, so the name would be hard to register or defend. Options: a distinctive brand with the phrase as category, a coined name, or an early intent-to-use filing.

4. Seed data exists. About 70 recurring SoCal meets were captured with venue, cadence, hours and social links; a dozen sit within 30 minutes of Fontana. Directories disagree with organizers, so every record needs an Instagram check.

5. Import: Eventbrite is the only source with a usable official API. Evite and Partiful prohibit scraping and offer no API; Facebook bans automated collection; Instagram allows oEmbed for display only. Build the importer as text plus image plus optional API payload in, draft event out, using LLM extraction and OCR.

6. Attendees care about arrival time, parking, which cars will show, rules and police, families, and whether this week's meet is on. A host-confirmed "on this week" status may matter more than RSVPs.

## Top 5 open questions

1. What does an Evite invite page serve without login (OG tags, hydration JSON, gating), and is a single user-initiated device-side preview fetch acceptable under Evite's Section 11?

2. Keep "Cars and Coffee" as the working title and file intent-to-use in classes 009 and 042, or choose a distinctive brand now? What grounds do the 86741281 office actions cite?

3. Will organizers claim and maintain pages, or does the app need crowd confirmation ("I'm here," photo check-ins) to keep "on this week" accurate?

4. How should irregular cadences ("dates announced on IG," seasonal First Fridays) be modeled without false confidence?

5. Which channel earns the first 1,000 IE users: meet photographers, venue partners, regional Facebook groups, or organizers linking the app in their bios?
