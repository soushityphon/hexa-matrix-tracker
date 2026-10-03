# Asset delivery review, Issue #30

## Decision, 3 October 2026, Brisbane

Retain the current delivery and cache policy. This review adds offline measurement
and compiled-handler coverage, not a hosting change. No measured live latency,
transfer, memory or startup failure establishes a need to move assets, change
cache lifetimes, compress artwork or add an image proxy. Do not infer platform
bundle limits from a generic Cloudflare plan. Verify the selected Sites runtime's
supported limits and migration path before proposing such a change.

Hosting identity verification remains partial. This independent review can run
without changing authentication, audience, origins, bindings or secrets. PR #22
stays draft and unmerged; eventual release remains unapproved.

## Repeatable offline measurements

Run `npm run build`, then `node scripts/review-asset-delivery.mjs`. The script
reads the real compiled `ASSETS` map, checks every value against its source bytes,
and reports original and embedded sizes. It makes no network requests or D1 reads.
It also inventories image URLs in dated repository evidence and the footer,
not the live saved Skills catalogue. Re-run after changing media or the build.

Measured against development app head `dd490f6` and test version 130:

| Group | Files | Original bytes | Embedded value bytes |
| --- | ---: | ---: | ---: |
| HTML, JavaScript and CSS | 35 | 251,375 | 251,375 |
| Resource icons | 2 | 13,634 | 18,184 |
| Stat icons | 6 | 5,344 | 7,132 |
| Ren music | 1 | 959,612 | 1,279,484 |
| Background artwork | 23 | 307,216 | 409,648 |

Binary originals total 1,285,806 bytes; base64 values total 1,714,448 bytes,
an increase of 428,642 bytes. The main Worker module is 2,016,262 bytes including
JSON escaping, text and handler code. Local gzip gives 1,360,523 bytes. The 13
server modules total 2,113,570 raw bytes. These are build/compression measurements,
not deployment archive size, HTTP traffic, platform billing or runtime memory.
Music accounts for most binary bytes; it is original media and remains unchanged.

The Worker embeds media but sends decoded original PNG/MP3 bytes to the browser.
The browser does not download the full Worker module as a page asset. Music uses
`preload = 'none'` and is created after the player's gesture; embedding it in the
server build does not make it an initial page download. Existing real Chromium
music checks cover that behaviour and native seeking/looping.

## Caching and delivery

HTML, JavaScript and CSS use `Cache-Control: no-store`. PNG and MP3 use
`public, max-age=60`. Public catalogue/priority requests retain the existing
no-store fetches and short in-memory class cache; this review does not add a
persistent source cache. Admin responses retain their private no-store handling.

Current asset URLs are not content-hashed. Increasing their browser lifetime
without URL versioning could retain old code/artwork through a test deployment
or rollback. Keep the short current policy. Future cache changes need measured
benefit and a reviewed versioning/rollback plan. No CDN cache-hit rate or live
gateway cache-header behaviour is inferred from isolated handler responses.

`npm run test:assets` checks exact compiled GET/HEAD bytes, MIME and cache policy
for all 67 bundled assets, including the previously untraversed
`skill-cost-review.js`. Added checks exercise the compiled MP3 handler's closed,
open, suffix and clipped-end ranges, rejected malformed/unsatisfiable/multiple
ranges, exact partial bytes/lengths and empty HEAD. Private development/evidence
paths remain unavailable. These checks are offline and use no live credentials.

## External icons and failure behaviour

Dated repository evidence contains 27 unique MapleScouter image URLs and one
official Ko-fi footer image URL. Live saved Skills/priority captures may contain
other URLs; this count is not a claim about current D1 rows or an allowlist.
Reviewed source icon identities remain replaceable through the existing data
catalogue, independent of display names, progress IDs and calculations.

Skill artwork still loads from MapleScouter. Resource/Stat/background icons and
music are local. Matrix and Next Upgrade retain their letter fallback, priority
rows retain the skill label, and Infographic retains its letter/accessible name
when an image fails. Existing browser failure scenarios use blocked/stubbed art;
they establish usable layout, not live upstream image availability. Ko-fi keeps
its accessible link/alt text and original destination.

Do not copy every dated evidence URL into the bundle or rewrite saved captures.
A later local-icon batch should use the current reviewed catalogue's stable
class/core IDs, verify original image bytes/type and reuse files across priorities,
following #12. That work is deferred until there is a reliable permitted retrieval
path and supported storage/delivery plan. No image retrieval, proxy, live catalogue
edit, source request, cost/FD change or progress migration is performed here.

## Evidence and remaining checks

The asset review is complete as a measurement/review task, with current delivery
retained. No served app change requires deployment; public test version 130 stays
live. New tests do not imply owner acceptance of older pending UI/admin checks.

Remaining hosting checks are in `hosting-identity-review.md`: ordinary owner
read-only access, signed-in non-owner spoof replacement and direct-origin
assurance. Live hotlink delivery and physical-device coverage are not established
by this offline review. Do not clear browser saves or modify live priorities to
test these items. Next independent task is README/backlog cleanup, followed by
eventual release/acceptance/rollback documentation.
