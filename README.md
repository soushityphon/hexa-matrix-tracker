# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Heroic and Interactive Lotus priorities for current GMS
- Taotie future GMS planning view using KMS priority snapshots, with Taotie catch-up materials
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Live remaining upgrade order that skips completed checkpoints even when levels were raised out of order
- Intermediate level material costs calculated automatically
- Quick Stats with next level, next checkpoint, completion and spent materials
- Optional Sol Janus inclusion in completion and spent material totals

HEXA Stats are priority-only RNG checkpoints. Their material cost is intentionally not estimated. The skill node completion and material totals include Taotie only in the future planning view. Sol Janus is an editable level but is excluded from those totals unless selected. Ren is planned for a later milestone.

## Data model

`data.js` contains node metadata, universal level-by-level HEXA material costs, GMS Lotus and KMS Taotie Hoyoung Scouter priority snapshots from the 23 August 2026 tracker workbook. Taotie is selectable to plan for its future GMS release and estimate how much Sol Erda and how many Fragments bring it through the completed part of a player's existing progression. These priorities are dated snapshots. MapleScouter is the intended source for later patch updates, with GMS and KMS kept distinct. The UI never needs an expanded priority CSV. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2, 3, 4, 5 and 6 itself.

## Hosting

The project is static and is suitable for Cloudflare Workers static assets or Cloudflare Pages.
