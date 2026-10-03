# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix tracker for Hoyoung and Ren. It shows
MapleScouter upgrade priorities, captured material costs and approximate FD,
with separate saved progress for each class.

## Current status, 3 October 2026, Brisbane

- Development is on `restore-scouter-retrieval`. [PR #22](https://github.com/soushityphon/hexa-matrix-tracker/pull/22)
  stays **draft and unmerged**. Main is older than the test implementation.
- The [public test tracker](https://soushi-hexa-matrix-test.xsoushi.chatgpt.site)
  is deployed version **138**, Site source
  `9ae921369177401e85695b5edfeb2be801ff5c32`, deployment
  `appgdep_6ac092a96e408191838a59040562103b`, environment revision **11**.
  This increment restores Summary and adds the owner-requested desktop hover
  popup. Helper is excluded on phones/no-hover devices. Admin content is accepted;
  version137's larger popup, tooltip removal and compact Stat heading are owner-reported accepted. This increment gives each Matrix quadrant its own colour; its colour review is now owner-reported accepted. Discord Admin preparation is the next batch. Prototype/docs are not served.
  Deployment succeeded; no signed-in requests or hosting proof are inferred.
- [Issue #30](https://github.com/soushityphon/hexa-matrix-tracker/issues/30)
  is the audit authority. Read its latest body and all comments before continuing.
  [Issue #23](https://github.com/soushityphon/hexa-matrix-tracker/issues/23)
  retains the wider product requirements and history.
- Existing app/audit work is implemented, tested and deployed through version 130.
  Soushi accepted all previously pending app checks on 3 October. This is owner-
  reported acceptance, not new device, fault-injection or hosting proof.
- Current order under #30: remaining hosting evidence and release preparation
  together, Helper [#31](https://github.com/soushityphon/hexa-matrix-tracker/issues/31),
  Discord Admin login [#15](https://github.com/soushityphon/hexa-matrix-tracker/issues/15),
  then Cloudflare Pages release [#32](https://github.com/soushityphon/hexa-matrix-tracker/issues/32).
- Hosting proof remains blocked/partial. No repeat investigation without new
  evidence or an authorised non-owner session/verified origin. This does not block
  independent Helper mapping/prototype work after release preparation.
- [Release plan](docs/release-plan.md) separates preparation from the final immutable
  commit/deployment record in step 4. pages.dev is authorised after preceding work;
  PR #22 remains draft/unmerged until tested release readiness is established.
- Helper mapping and Admin content are accepted. The owner supersedes the earlier
  Summary split: restore the old Summary and use a hover-only popup, Matrix above
  icon/tag/name above optional text, small icon/name heading for Stats, without a large duplicate icon. No guide at rest
  or automatic next-step preview. Helper is excluded on phones/no-hover devices.
  Hover-only integration is implemented, tested and deployed in version136;
  version136 behaviour is owner-reported accepted. The 460px popup, absent native tooltip and compact Stat heading are owner-reported accepted in version137. Four category colours are implemented, tested and deployed in version138; their visual acceptance is owner-reported complete in #30/#31.
  See [integration review](docs/helper-integration-review.md).
- Discord Admin authentication is implemented behind runtime configuration. Live
  activation needs the dedicated OAuth app, verified owner ID and server secrets.
  Current Sites access is preserved. Optional player sync is not implemented.
  See [setup and session policy](docs/discord-admin-login.md).
- Existing browser saves do not require migration. Preserve all Admin-managed
  server data at cutover, including intervening edits and future Helper content.
  Infographic export/print and multiple-character work remain deferred.

See the [backlog index](docs/backlog.md) for old issues, acceptance and deferred
work. [Historical notes](docs/development-history.md) preserve the previous README.
Its old plans, blockers and deployment states are not current requirements.

## Tracker behaviour

Both classes support Tracker and Infographic. Update labels are saved pair names,
identified by pair ID, not fixed patch selectors. Heroic uses Fragment priorities;
Interactive uses Sol Erda priorities within that pair. Only available reviewed
priorities appear. Switching class/order/world retains hidden levels; Reset
changes only the selected class.

Origin starts at its captured free level-one baseline. Ordinary skills allow
integer levels up to 30. Stat lines allow 0–10 each, combined maximum 20. Missing
legacy splits are never invented. Stat unlock and completion state stay distinct.
The approved general-average FD table applies only to valid line totals of 20.
Random Stat levelling costs and combined personal FD are not calculated. Completion
retains the agreed Fragment-spending formula and display, without extra RNG notes.

Sol Janus stays editable in Current HEXA Matrix and is always excluded from
Upgrade Priority. Optional Summary inclusion works in both views. It uses the
selected capture's Janus schedule, or its Hecate schedule under the owner's equal-
materials decision. Missing schedules disable inclusion rather than invent costs.

Tracker hides the visual step count and numbering column, uses **Target Lv.**
and right-aligns resource headings. A 4px header-only offset aligns visible art
within the unchanged PNGs. Next Upgrade uses current-to-target labels, **Add 1
Level** and **Add to checkpoint**. Inventory shortfall amounts remain without the
repeated caption. Upgrade actions never spend inventory. Stat editors have thin
clickable bars with numbers on the right. Numeric inputs select the whole value.

Infographic shares progress and Summary with Tracker. Grouped checkpoints retain
source endpoint positions; completed icons fade. Hide completed saves separately.
Recorded checkpoint clicks support reverse-order undo per skill. Pre-existing
completion has no invented undo. Ordinary Undo restores the last affected skill/
Stat state without changing resources. All infographic export/print work is deferred
by owner decision, not required for release. Revisit only if the owner requests it.

The Heroic-only Fragment Calculator uses inventory, daily farming and owner-supplied
weekly rewards: Erda's Request 90, High Mountain 40, Angler Company 55 or Nightmare
Paradise 70. Weekly income is averaged over seven days without rate rounding.
Weekly-only estimates use approximate weeks; positive daily farming uses decimal
days. Summary dates use the player's local date/locale, rounding up only for calendar
addition. Zero income hides estimates. Inventory affects estimates, not full costs
or completion.

FD controls support hover, tap and keyboard explanations with modal focus return.
Full transitions compound multiplicatively; partial transitions retain the approved
Fragment-cost-share estimate. Missing source FD stays blank. The shared footer
says **Data sourced from MapleScouter and community resources on Inven and Naver.**
and **A project by Soushi**, with the
existing Ko-fi link. Detailed source dialogs are declined.

Hoyoung clouds and Ren petals use original local artwork. Animations honours
reduced motion and a saved browser preference; panels retain 80% fills. Ren music
loads only after a positive volume gesture, loops and starts muted on page load.
Class switches rewind/mute it. Volume is not saved. Supplied audio, motion and
version 114 phone checks are owner-reported accepted, without a specific device
or exhaustive coverage claim.

## Player saves and loading

Progress stays local under `hexa-tracker-hoyoung-v1` and `hexa-tracker-ren-v1`.
Storage failures retain session edits with an unsaved warning. Malformed raw
records stay protected. Web Locks and baseline checks prevent silent stale writes.
Conflicts pause edits and offer **Load latest save** or confirmed **Continue this
save**. Neither choice downloads a file.

Manual Export contains all existing per-class saves, using Hoyeong/Len and Scouter
core IDs independently of display names. Import validates before confirmation,
replaces only included classes and clears imported infographic undo history.
It never downloads an automatic backup. Cancel preserves progress so the player
can Export first. Damaged/unreadable records cannot be exported as defaults.

Source reads share a 15-second full-response deadline and a 30-second in-memory
cache. Fresh focus returns reuse verified data; expired views refresh. Same-class
failures retain the view with edits paused and Retry available. Initial/class-switch
failures do not borrow another class's view. Picker focus cannot interrupt import.
Unchanged refreshes retain drafts, validation and focus; changed source follows
existing guarded rebuild rules. Loading/error notices do not shift panels.

## Source data and administration

The owner-only Admin Panel has class tabs, Skills and Priorities. Grab Scouter info
retrieves a catalogue and the selected region's two orders for review. First failure
stops remaining calls; 429/430 pauses checks. Background priority detection and
automatic promotion are not connected. New named pairs start unavailable.
Skills reviews own long/short names, categories, editable tags and optional Helper
explanations (4000 characters, line breaks and **bold**, with a safe content preview).
Saved empty tags
remain empty. They cannot rewrite captured order, cost or FD values.

Each priority owns its exact captured per-level schedules and transition FD.
Later refreshes do not backfill missing historic costs/gains. Old records remain
downloadable; missing schedules show unavailable calculations. Advanced response
import requires the response and its own catalogue. Dated `data/` files are source/
regression evidence, not a claim about live priorities or universal optimal orders.

Four genuine Ren captures were verified in the 1 October investigation: KMS
Heroic/Interactive 211/93 checkpoints and GMS Heroic/Interactive 191/85. They use
the verified rank 1 KMS all-world HEXA converted-strength benchmark. GMS is an
explicit calculation selector, not the benchmark character's origin. Reusable
acquisition/semantic-review tools remain separate offline groundwork, not an
approved universal class importer. See [source investigation](docs/scouter-discovery.md).

Damaged admin rows are isolated with owner-only raw recovery downloads and never
silently repaired/overwritten. Skills, priority groups and legacy row writes use
revisions and atomic guards. Restore stays insert-only and transactional;
maintenance preserves peer changes. Safe diagnostics log fixed labels/counts only.
Development tests use isolated data, never live resets.

## Development checks and hosting

Use Node **24.19.0**, pinned in `.node-version`, and locked dependencies:

```sh
npm ci --ignore-scripts
npm run check
node scripts/review-asset-delivery.mjs
```

`check` runs 30 regression files, builds the Worker, checks JavaScript syntax and
verifies compiled asset delivery/private exclusions. GitHub Tracker checks runs
this work, offline inventory and Chromium on pushes/PRs. Last recorded asset-review
CI has 75 ordinary browser passes and zero expected failures. Counts are checkpoint
evidence, not verification of a new commit. [Rendered QA](docs/rendered-qa.md)
documents browser commands, fixtures, emulation and device limits.

`scripts/build-worker.mjs` packages plain HTML/JS/CSS and original media for the
existing Sites Cloudflare Worker. Test viewing is public; admin stays owner-only.
The Site's private hosting setup has existing D1 `DB` and server-only secrets.
Hosting configuration is not committed here. Do not create a second Cloudflare
host or change audience, bindings, secrets or schema as cleanup.

Use the documented Sites route for authorised, tested app increments. Compare
checked GitHub source/assets with Site source, record saved version, source/
deployment IDs and successful status in #30, and retain a known saved rollback.
Documentation-only changes need no Site deployment. Preserve browser saves and
D1. Test deployment does not approve merge or eventual release. Obtain remaining
identity/origin evidence before any hosting change; isolated matching headers
are not live authentication proof.

See [hosting identity evidence](docs/hosting-identity-review.md) and
[asset delivery review](docs/asset-delivery-review.md). Retain cache lifetimes,
base64 packaging and external skill icons. Offline sizes do not establish live
performance or platform limits.
