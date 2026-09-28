# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix priority and material tracker. The first milestone replaces the Hoyoung spreadsheet workflow with a small calculation engine and Scouter checkpoint data.

## Current scope

- Hoyoung
- Heroic and Interactive Scouter priorities for Hecate, Lotus and Taotie snapshots
- Current HEXA level inputs saved in the browser
- Compact priority checkpoints
- Intermediate level material costs calculated automatically
- Next checkpoint and next individual level summaries

HEXA Stats are priority-only RNG checkpoints. Their material cost is intentionally not estimated. The skill node completion and material totals include nodes available in the selected snapshot. Ren is planned for a later milestone.

## Data model

`data.js` contains node metadata, universal level-by-level HEXA material costs and six Hoyoung Scouter priority snapshots from the 23 August 2026 tracker workbook. The source Hecate Interactive list repeats HEXA Stat II where the other Interactive snapshots have HEXA Stat III. This copy corrects that apparent source typo. The UI never needs an expanded priority CSV. If a checkpoint says Harmony 1 to 6, the calculator sums levels 2, 3, 4, 5 and 6 itself.

## Hosting

The project is static and is suitable for Cloudflare Workers static assets or Cloudflare Pages.
