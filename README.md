# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Hecate and Lotus patch selections, with the GMS Lotus Heroic order captured from Maple Scouter
- Normal KMS Taotie skills and captured priority steps
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Live remaining upgrade order that skips completed checkpoints even when levels were raised out of order
- Intermediate level material costs calculated automatically
- Quick Stats with next level, next checkpoint, completion and spent materials
- Optional Sol Janus inclusion in completion and spent material totals

The earlier captured Maple Scouter orders do not contain HEXA Stat checkpoints. Live orders can include `hexastat1`, `hexastat2` or `hexastat3`. The importer treats each as a level 20 HEXA Stat checkpoint and carries its Nexon icon through the reviewed draft to the tracker. Each Stat has a fixed unlock cost and a separate Unlocked control because level 0 may already be unlocked. Later levelling uses variable Fragments, so a priority shows the unlock Fragment cost with `+` while it is locked, or RNG after unlock. Fixed unlocks for Stats present in the saved order are included in material totals; variable levelling is excluded. The skill node completion and material totals include Taotie only in the future planning view. Sol Janus is an editable level but is excluded from those totals unless selected. Ren is planned for a later milestone.

## Data model

The reusable isolated Scouter acquisition and 30 September investigation are documented in [docs/scouter-discovery.md](docs/scouter-discovery.md). The new commands discover a candidate job catalogue from current public frontend files and reconstruct a validated response without importing the reviewed tracker catalogue or changing live data. Source identity, exact level schedules and display overrides remain separate; candidates are not publishable automatically. The independent review overlay helper stores job/core names and exact-candidate visibility choices without changing source checkpoints, costs or FD. It is offline groundwork, with no admin persistence, migration or promotion connected yet.

`data.js` contains node metadata, level-by-level HEXA material costs, and directly captured Maple Scouter orders. `data/scouter-gms-2026-09-28.json` is the GMS Hoyoung Lotus Heroic order supplied from Maple Scouter's HEXA API. The source response includes 화중군자 VI (Lotus), Sol Hecate, and no Taotie. `data/scouter-kms-2026-09-28.json` contains Taotie Piece and Erda efficiency orders from a reset baseline on a public KMS profile. These are dated benchmarks, not personal optimisations. Hecate Heroic/Interactive and Lotus Interactive remain empty pending verified source data. Hecate omits Lotus and Taotie from completion; Lotus omits Taotie. Taotie has no extra catch-up box or special calculation. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2 through 6 itself.

## Hosting

The source pages are plain HTML and JavaScript. `node scripts/build-worker.mjs` bundles them in a Cloudflare Worker for the private Sites deployment.

## Priority review

Open `priority-review.html` as the site owner. The **Admin Panel** has **Skills** and **Priorities** tabs. Choose Hoyoung and GMS/KMS, then **Grab Scouter info** retrieves the public source catalogue and the selected region's two priority orders sequentially. Successful requests are cached for five minutes; the first failure stops the remaining calls, and 429/430 pauses further checks. No import automatically changes a saved priority's availability.

Skills holds independent per-class long/short names, category and tag fields. Source names, icons and exact detected costs remain separate. Later captures preserve owner fields and append new source skills with blank fields. Conflicting names across old versions are shown for the owner to choose, rather than silently picking one. **Add standard tags** fills only empty tags. **Save skills** writes a separate D1 record and overlays complete known-skill labels on the test tracker without rewriting any saved order. Unknown skills can be named in this list, but their tracker support remains pending.

Priorities shows both captured orders, exact-order matches across saved versions of the same world, checkpoint counts and source FD. A match is a comparison result and always allows a new named pair. Enter a name and click **Save priority** to save **Heroic** and **Interactive** together in a D1 transaction. New priorities start unavailable; use **Make available** in Saved priorities when ready. Pair IDs are opaque and independent of region; region remains capture provenance. The tracker shows only skills in the selected priority order and calculates with that priority’s captured schedules. Hidden skills keep their browser progress. The newest-first saved list supports availability, rename, download/upload backups, and confirmed deletion. Older individual versions remain intact and can also be downloaded/restored. Restored priorities start unavailable. No backup import overwrites class skill names. Advanced response-file import remains a fallback. The diagnostics and cost-table sections are removed from this panel.

Viewing the test tracker is public, with owner-only admin actions and Scouter order requests. Save affects this live testing tracker; the eventual release remains separate. Ren is visibly pending and cannot be selected as supported. This deploy connects the approved admin design to the existing Hoyoung retrieval/import validations. It does not claim the newer isolated semantic-evidence policy or universal reconstruction workflow is complete. GMS all-three-Stat semantics and genuine Ren benchmark construction still need evidence. Development checks make no live calculation calls.

The Sites Worker requires a D1 binding named `DB` configured as `"d1": "DB"` in `.openai/hosting.json`; `drizzle/0000_priority_preview.sql` creates the preview table. Set a secret `ADMIN_EMAIL` to the site owner's authenticated email. The site-scoped user ID is not the workspace account ID. Only that identity may open the admin review page or change shared priorities. The GET route is available to viewers of the private site. Progress levels and resources remain in each browser.

The private Worker uses `MAPLE_SCOUTER_API_KEY` and two server secrets, `MAPLE_SCOUTER_REQUEST_PART_1` and `MAPLE_SCOUTER_REQUEST_PART_2`, for the supplied GMS Hoyoung request body. KMS Taotie uses `MAPLE_SCOUTER_KMS_REQUEST_PART_1` and `MAPLE_SCOUTER_KMS_REQUEST_PART_2`; configure those once with the complete fixed-profile KMS request. Neither template belongs in the public repository. The Worker validates the KMS template's unopened HEXA Stats, level-one Origin and all other skills at zero, then sets `sole: false` for Fragments or `sole: true` for Sol Erda. GMS retrieval has been verified on the private preview. The KMS fixed-profile template is configured privately. Both GMS request copies have HEXA Stat set to zero before sending. Historical Hecate cannot be retrieved from the current endpoint. The check never publishes an order. You can also upload or paste a Maple Scouter response.

For a repeatable source audit, run `node scripts/extract-scouter-order.mjs response.json taotie_heroic --out extracted.json`. It extracts ordered checkpoints, icons, source material columns and the first difference from the saved order without copying the character profile. It checks cumulative material arithmetic and each fixed-cost skill checkpoint against the app's level table; HEXA Stat material figures are identified as Scouter estimates because their upgrades are random. The attached 206-row Taotie Fragment response passes these checks. Ascent uses the Skill cost schedule (5 Sol Erda and 100 Fragments at unlock), while Taotie uses Skill II.

Reviewed imports retain the exact Scouter `sourceCost` for each fixed-cost checkpoint as `{ from, erda, frags }` on that step. A multi-level checkpoint stores its total for that transition, not per-level values. Older saved orders without this field remain valid. New grabs retain the exact per-level Scouter catalogue schedules and their public-source hashes with each priority. Transition checks and tracker calculations use that snapshot. Mismatches block the fresh import. HEXA Stat Scouter estimates are not stored as fixed transition costs.

The Admin Panel keeps cost schedules in source snapshots and omits diagnostic cost tables. A matched response may be saved as a new named pair. Unknown skills still require verified tracker support before promotion.

The first Apotheosis transition starts at level 1, its free Origin baseline. Fresh Scouter FD annotations record that start as 1. Older saved/captured annotations with `fdFrom: 0` remain readable; partial FD estimates treat their effective start as 1 so the free unlock is not counted in the Fragment-cost share.

Background Maple Scouter priority detection is not connected. The observed HEXA endpoint is undocumented and may change. The image URLs are sourced from Maple Scouter, with the Sol Janus URL corrected to its working Maple Scouter image. Browser progress is saved locally; Discord login and cross-device sync are future work. To remove remote image dependencies, save and review image assets in the repository when a reliable retrieval workflow is available.

The tracker uses only the saved Admin Panel Skills catalogue. An empty catalogue produces an empty skill list. Reviewed names, short names, categories, tags, icons and detected level costs are shared across priority versions. Incomplete or unsupported rows remain pending. Priorities cannot be made available until all their skills have been reviewed and saved.

The complete tracker backup can be uploaded through the Admin Panel backup control. Restoration refuses existing IDs and skill catalogues, and starts restored priorities as unavailable. The maintenance export/reset route requires the owner identity or a temporary ADMIN_MAINTENANCE_TOKEN; reset deletes only the exact backed-up priority rows. Remove the temporary token after maintenance.

Tags are owned by Admin Panel Skills. Newly discovered Origin, Ascent and Mastery skills receive editable standard tags in their admin fields. Saving an empty tag removes it from the matrix, Next Upgrade and priority list. Source refresh preserves a saved empty tag; Add standard tags can refill it when requested. The tracker has no stylesheet tag fallback.

## Capture-specific materials and FD, 1 October

New Admin Panel grabs snapshot the Scouter catalogue’s exact per-level costs and source hashes alongside each world’s response. Cached responses retain their own catalogue snapshot, even if a newer catalogue is fetched. Save, rename, availability and backups preserve these fields. Independent skill reviews continue to control names, categories and editable tags, while later source refreshes cannot replace a saved priority’s cost or FD values.

The tracker uses the selected priority’s schedules for next levels, jumps, totals and partial-transition FD cost shares. It does not attach historic FD to a matching order. Missing FD stays blank. `source-gains.js` remains dated regression evidence, but is neither loaded by the tracker nor included as a public Worker asset.

Older priorities that lack captured per-level schedules remain stored, readable and downloadable. Their material calculations show an unavailable message until the owner makes a fresh grab and saves a new pair. No missing historical schedules are filled from today’s Skills record or fixed Hoyoung tables. Legacy fixed tables remain only for dated offline regression/extraction tools that have no supplied catalogue. HEXA Stat unlocks retain the existing separate unlock schedule and RNG treatment; Scouter’s aggregate Stat figures are not converted into exact level costs.

Advanced response-file import requires an envelope containing `response` and its own `catalogue`; a bare response cannot establish capture-specific per-level costs. Normal owner workflow remains Grab Scouter info. No saved data migration, reset or player-progress change is required.

Ren remains unsupported. The previous KMS experiment used substituted Hoyoung benchmark statistics, so it cannot verify a genuine Ren request. This continuation could not retrieve the ranking API, profile route or frontend chunks in the restricted workspace. No calculation request was made. Genuine highest-level Ren profile/request construction, GMS/KMS and both material modes still require source evidence before enabling Ren.

Tracker Update choices use saved priority pair IDs and the owner’s pair names. A pair named Lotus appears as Lotus regardless of GMS/KMS provenance. Heroic/Interactive switches within that selected pair. Separate pairs with the same name remain separate by ID. Source region/patch remain internal capture metadata, and renaming a saved pair updates the dropdown label without changing order, costs, FD or player levels.
