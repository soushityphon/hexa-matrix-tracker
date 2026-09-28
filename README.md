# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Heroic Scouter, fragment-limited priority
- Interactive Scouter, Sol Erda-limited priority
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Intermediate level material costs calculated automatically
- Next checkpoint and next individual level summaries

HEXA Stats are priority-only RNG checkpoints. Their material cost is intentionally not estimated. Ren is planned for a later milestone.

## Data model

`data.js` contains node metadata, universal level-by-level HEXA material costs extracted from the existing tracker, and the current Hoyoung Scouter priority snapshots. The UI never needs an expanded priority CSV. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2, 3, 4, 5 and 6 itself.

## Hosting

The project is static and is suitable for Cloudflare Workers static assets or Cloudflare Pages.
