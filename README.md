# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Hecate and Lotus patch selections awaiting verified GMS Maple Scouter orders
- Taotie future GMS planning view using KMS Maple Scouter priority snapshots, with Taotie catch-up materials
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Live remaining upgrade order that skips completed checkpoints even when levels were raised out of order
- Intermediate level material costs calculated automatically
- Quick Stats with next level, next checkpoint, completion and spent materials
- Optional Sol Janus inclusion in completion and spent material totals

The captured Maple Scouter orders do not contain HEXA Stat checkpoints. The skill node completion and material totals include Taotie only in the future planning view. Sol Janus is an editable level but is excluded from those totals unless selected. Ren is planned for a later milestone.

## Data model

`data.js` contains node metadata, level-by-level HEXA material costs, and two directly captured KMS Hoyoung Maple Scouter orders. The source capture is in `data/scouter-kms-2026-09-28.json`: reset baseline, standard boss, all core types, Piece and Erda efficiency, using a public Hoyoung profile. It is a dated benchmark, not a personal optimisation for every player. Hecate and Lotus orders are empty pending verified GMS source data. Hecate omits Lotus and Taotie from completion; Lotus omits Taotie. Taotie is selectable to estimate its future GMS catch-up cost. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2 through 6 itself.

## Hosting

The project is static and is suitable for Cloudflare Workers static assets or Cloudflare Pages.

## Priority review

Open `priority-review.html` to edit a draft priority and the public display names. The draft is stored in that browser. `Review changes` validates the order against known skill keys and compares it with the current mode. `Download draft` saves a JSON file for review. To apply an approved draft in a checkout, run `node scripts/apply-priority-draft.mjs path/to/draft.json`, run `npm test`, then review and merge the change through GitHub. The editor does not publish by itself.

Automatic Maple Scouter priority detection is not connected. The current source does not expose a documented public priority feed. The image URLs are sourced from Maple Scouter, with the Sol Janus URL corrected to its working Maple Scouter image. Browser progress is saved locally; Discord login and cross-device sync are future work. To remove remote image dependencies, save and review image assets in the repository when a reliable retrieval workflow is available.
