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

The captured Maple Scouter orders do not contain HEXA Stat checkpoints. The skill node completion and material totals include Taotie only in the future planning view. Sol Janus is an editable level but is excluded from those totals unless selected. Ren is planned for a later milestone.

## Data model

`data.js` contains node metadata, level-by-level HEXA material costs, and directly captured Maple Scouter orders. `data/scouter-gms-2026-09-28.json` is the GMS Hoyoung Lotus Heroic order supplied from Maple Scouter's HEXA API. The source response includes 화중군자 VI (Lotus), Sol Hecate, and no Taotie. `data/scouter-kms-2026-09-28.json` contains Taotie Piece and Erda efficiency orders from a reset baseline on a public KMS profile. These are dated benchmarks, not personal optimisations. Hecate Heroic/Interactive and Lotus Interactive remain empty pending verified source data. Hecate omits Lotus and Taotie from completion; Lotus omits Taotie. Taotie is selectable to estimate its future GMS catch-up cost. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2 through 6 itself.

## Hosting

The source pages are plain HTML and JavaScript. `node scripts/build-worker.mjs` bundles them in a Cloudflare Worker for the private Sites deployment.

## Priority review

Open `priority-review.html` to edit a priority, its display names, and its tracker visibility. The draft is stored in that browser. The visible **Check for new priorities** button requests both current GMS Lotus orders and compares each with imported versions for its world. A changed order has a Review action that opens naming, unknown skill classification and the visibility choice. The private Worker uses `MAPLE_SCOUTER_API_KEY` and two server secrets, `MAPLE_SCOUTER_REQUEST_PART_1` and `MAPLE_SCOUTER_REQUEST_PART_2`. Concatenate the two parts without a separator to recover the supplied GMS Hoyoung request body, which stays out of the public repository and browser storage. The successful browser requests differ by `sole: false` for Fragments and `sole: true` for Sol Erda. The Worker sets this field for the selected mode. Live upstream reachability still needs verification. Historical Hecate cannot be retrieved from the current endpoint, and KMS Taotie needs a separate KMS request template. The check never publishes an order. You can also paste a Maple Scouter order response. `Download draft` saves a JSON file for review. To apply a reviewed draft in a checkout, run `node scripts/apply-priority-draft.mjs path/to/draft.json`, run `npm test`, then review and merge the change through GitHub. The visibility setting becomes effective when that update is deployed. Unverified empty priorities are hidden by default.

Background Maple Scouter priority detection is not connected. The observed HEXA endpoint is undocumented and may change. The image URLs are sourced from Maple Scouter, with the Sol Janus URL corrected to its working Maple Scouter image. Browser progress is saved locally; Discord login and cross-device sync are future work. To remove remote image dependencies, save and review image assets in the repository when a reliable retrieval workflow is available.
