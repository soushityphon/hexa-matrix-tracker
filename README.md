# HEXA Matrix Tracker

A browser-based MapleStory HEXA Matrix tracker for Hoyoung and Ren. It shows
MapleScouter upgrade priorities, captured material costs and approximate FD,
with separate saved progress for each class.

## Current release, 4 October 2026, Brisbane

The [public tracker](https://hexa-matrix-tracker.pages.dev) runs app commit
6ab7c1cc189a34c563d956f52870b8640f44fd4e, with successful CI and Cloudflare deployment.
[PR22](https://github.com/soushityphon/hexa-matrix-tracker/pull/22) is merged into
main at53541a4fc1599ed34a516ffb42cc677780a091bf. Its reviewed head0f3385c passed
push/PR CI; merge tree is identical. Only repository documentation differs from
the deployed app. Use main as the current implementation baseline.

Existing app/audit/Helper and Pages owner login/logout, alt-account refusal,
functional Admin data, public dropdown sorting and stored session-cookie settings/
scheduled expiry are owner-accepted. No repeat is needed without an affecting change.
Cookie evidence does not claim an observed eight-hour wait. Admin-data acceptance
is functional testing plus prior exact preparation transfer, not a new final raw audit.

[Issue30](https://github.com/soushityphon/hexa-matrix-tracker/issues/30) retains audit
history; Issue23 retains product scope. [Production record](docs/pages-production-record.md)
has exact CI/deployment/merge evidence, limits and rollback preserving current
Pages data. Production deploys through the checked pages-production branch.
Do not change its DB/settings/secrets or restore stale old-host data as cleanup.

[Pages guide](docs/pages-release.md), [release plan](docs/release-plan.md) and
[Discord session policy](docs/discord-admin-login.md) retain setup/history.
Old Sites header-identity proof stays separately blocked and is not Pages Admin
authentication. Optional player sync, further classes, multiple characters and
infographic export/print remain deferred. Existing browser saves need no migration.

See [backlog](docs/backlog.md) and [development history](docs/development-history.md).
Older checkpoint tasks and draft/preparation status are historical.

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

`check` runs the registered regressions, Pages adapter/snapshot checks, build,
JavaScript syntax and compiled asset delivery/private exclusions. GitHub Tracker checks runs
this work, offline inventory and Chromium on pushes/PRs. CI on implementation commit692fa21
has 84 ordinary browser passes and zero expected failures. Counts are checkpoint
evidence, not verification of a new commit. [Rendered QA](docs/rendered-qa.md)
documents browser commands, fixtures, emulation and device limits.

Use the Pages Git workflow for this live tracker: implement on the development
branch, validate the exact commit and CI, then fast-forward pages-production.
Verify the Cloudflare deployment check and affected live behaviour before recording
success. Preserve DB, secrets, captured schedules and player saves.
Documentation-only changes need no production deployment.

The Worker build remains shared with Pages. The old Sites source/hosting workflow
is relevant only for explicitly requested work on that old Site.
See [production record](docs/pages-production-record.md),
[hosting identity evidence](docs/hosting-identity-review.md) and
[asset delivery review](docs/asset-delivery-review.md). Keep existing cache,
asset packaging and external skill-icon behaviour. Offline checks do not establish
live performance or platform limits.
