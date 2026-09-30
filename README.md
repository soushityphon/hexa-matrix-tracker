# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Hecate and Lotus patch selections, with the GMS Lotus Heroic order captured from Maple Scouter
- Taotie future GMS planning view using KMS Maple Scouter priority snapshots, with Taotie catch-up materials
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Live remaining upgrade order that skips completed checkpoints even when levels were raised out of order
- Intermediate level material costs calculated automatically
- Quick Stats with next level, next checkpoint, completion and spent materials
- Optional Sol Janus inclusion in completion and spent material totals

The earlier captured Maple Scouter orders do not contain HEXA Stat checkpoints. Live orders can include `hexastat1`, `hexastat2` or `hexastat3`. The importer treats each as a level 20 HEXA Stat checkpoint and carries its Nexon icon through the reviewed draft to the tracker. Each Stat has a fixed unlock cost and a separate Unlocked control because level 0 may already be unlocked. Later levelling uses variable Fragments, so a priority shows the unlock Fragment cost with `+` while it is locked, or RNG after unlock. Fixed unlocks for Stats present in the saved order are included in material totals; variable levelling is excluded. The skill node completion and material totals include Taotie only in the future planning view. Sol Janus is an editable level but is excluded from those totals unless selected. Ren is planned for a later milestone.

## Data model

The reusable isolated Scouter acquisition and 30 September investigation are documented in [docs/scouter-discovery.md](docs/scouter-discovery.md). The new commands discover a candidate job catalogue from current public frontend files and reconstruct a validated response without importing the reviewed tracker catalogue or changing live data. Source identity, exact level schedules and display overrides remain separate; candidates are not publishable automatically.

`data.js` contains node metadata, level-by-level HEXA material costs, and directly captured Maple Scouter orders. `data/scouter-gms-2026-09-28.json` is the GMS Hoyoung Lotus Heroic order supplied from Maple Scouter's HEXA API. The source response includes 화중군자 VI (Lotus), Sol Hecate, and no Taotie. `data/scouter-kms-2026-09-28.json` contains Taotie Piece and Erda efficiency orders from a reset baseline on a public KMS profile. These are dated benchmarks, not personal optimisations. Hecate Heroic/Interactive and Lotus Interactive remain empty pending verified source data. Hecate omits Lotus and Taotie from completion; Lotus omits Taotie. Taotie is selectable to estimate its future GMS catch-up cost. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2 through 6 itself.

## Hosting

The source pages are plain HTML and JavaScript. `node scripts/build-worker.mjs` bundles them in a Cloudflare Worker for the private Sites deployment.

## Priority review

Open `priority-review.html` as the site owner to edit a priority, its display names, and tracker visibility. **Check for new priorities** requests GMS Lotus and KMS Taotie orders for both materials and compares them with saved imported versions. A changed order has a Review action that opens naming, unknown skill classification and the visibility choice. **Save to private test site** writes a validated priority to shared D1 storage; the private tracker loads it on every visit and refreshes it on focus. Enable/Disable saves visibility immediately. The migration button moves any previous browser-only drafts to the shared test site at the owner's request. New skills that are not in the cost table need a reviewed code update before this tracker can calculate their costs. Download a draft for review when needed. Public publishing will be a separate promotion step. Saved Scouter imports are the only runtime priority orders; an empty or failed D1 load makes priorities unavailable rather than restoring a repository capture. The repository captures remain as dated fixtures for validation and the source-context model, pending the wider job and update metadata refactor.

The Sites Worker requires a D1 binding named `DB` configured as `"d1": "DB"` in `.openai/hosting.json`; `drizzle/0000_priority_preview.sql` creates the preview table. Set a secret `ADMIN_EMAIL` to the site owner's authenticated email. The site-scoped user ID is not the workspace account ID. Only that identity may open the admin review page or change shared priorities. The GET route is available to viewers of the private site. Progress levels and resources remain in each browser.

The private Worker uses `MAPLE_SCOUTER_API_KEY` and two server secrets, `MAPLE_SCOUTER_REQUEST_PART_1` and `MAPLE_SCOUTER_REQUEST_PART_2`, for the supplied GMS Hoyoung request body. KMS Taotie uses `MAPLE_SCOUTER_KMS_REQUEST_PART_1` and `MAPLE_SCOUTER_KMS_REQUEST_PART_2`; configure those once with the complete fixed-profile KMS request. Neither template belongs in the public repository. The Worker validates the KMS template's unopened HEXA Stats, level-one Origin and all other skills at zero, then sets `sole: false` for Fragments or `sole: true` for Sol Erda. GMS retrieval has been verified on the private preview. The KMS fixed-profile template is configured privately. Both GMS request copies have HEXA Stat set to zero before sending. Historical Hecate cannot be retrieved from the current endpoint. The check never publishes an order. You can also upload or paste a Maple Scouter response.

For a repeatable source audit, run `node scripts/extract-scouter-order.mjs response.json taotie_heroic --out extracted.json`. It extracts ordered checkpoints, icons, source material columns and the first difference from the saved order without copying the character profile. It checks cumulative material arithmetic and each fixed-cost skill checkpoint against the app's level table; HEXA Stat material figures are identified as Scouter estimates because their upgrades are random. The attached 206-row Taotie Fragment response passes these checks. Ascent uses the Skill cost schedule (5 Sol Erda and 100 Fragments at unlock), while Taotie uses Skill II.

Reviewed imports retain the exact Scouter `sourceCost` for each fixed-cost checkpoint as `{ from, erda, frags }` on that step. A multi-level checkpoint stores its total for that transition, not per-level values. Older saved orders without this field remain valid. These observations do not replace the verified level schedules used by the tracker; mismatches found during a fresh check block its save for review. HEXA Stat Scouter estimates are not stored as fixed transition costs.

Priority Review now has a Hoyoung Skill & Costs section. It lists the current tracker schedule and any exact source transitions saved in the selected draft, marking one-level observations separately from aggregate ranges. A matching aggregate verifies only its total. Old versions show no source observations until reviewed against a new Scouter response. A matched response can be opened for review and saved to add its observations without creating another version. Known-skill cost mismatches are rejected on the server; new skills remain pending and cannot be published until their schedules are reviewed. Editing schedules and adding jobs are later work.

The first Apotheosis transition starts at level 1, its free Origin baseline. Fresh Scouter FD annotations record that start as 1. Older saved/captured annotations with `fdFrom: 0` remain readable; partial FD estimates treat their effective start as 1 so the free unlock is not counted in the Fragment-cost share.

Background Maple Scouter priority detection is not connected. The observed HEXA endpoint is undocumented and may change. The image URLs are sourced from Maple Scouter, with the Sol Janus URL corrected to its working Maple Scouter image. Browser progress is saved locally; Discord login and cross-device sync are future work. To remove remote image dependencies, save and review image assets in the repository when a reliable retrieval workflow is available.
