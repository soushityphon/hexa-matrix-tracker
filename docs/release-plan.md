# Eventual release and rollback plan

## Current preparation, 3 October 2026, Brisbane

Latest owner decisions in #30 supersede historical release/acceptance notes.
Current order: hosting evidence and release preparation together, Helper #31,
Discord login #15 with Admin first, then Cloudflare Pages/pages.dev #32.
The owner has authorised that release after its prerequisites. PR #22 stays draft
and unmerged during preparation until the tested release workflow establishes
readiness. No extra generic permission round is required for authorised work.

| Item | Prepared state |
| --- | --- |
| Reviewed GitHub baseline | `34ef8abcfe11510c7181f5a6208853eca947e4fb`, `restore-scouter-retrieval`, draft PR #22 |
| Existing app acceptance | Complete, owner-reported 3 October; not new device/fault/security evidence |
| Release scope | Current supported tracker plus Helper and verified Discord Admin login; exports/print and multiple characters deferred |
| Target | Cloudflare Pages, pages.dev; account/project/runtime route not yet verified |
| Final immutable release SHA | Record in priority 4 after Helper/login, with exact successful CI; not a Helper prerequisite |
| Final URL/deployment/merge | Record actual successful results in priority 4; none claimed yet |
| Hosting evidence | Partial/blocked, exact missing evidence in hosting-identity-review.md |
| Browser-save migration | Not required; existing current-site saves/local backup behaviour remain intact |
| Admin data | Preserve actual current data at cutover, including new edits and future Helper explanations |

Preparation is complete as a scope/acceptance/target/rollback record. Hosting proof
is explicitly blocked, not complete. Independent Helper mapping/prototype work may
continue with no hosting/access change. Preserve the existing test Site for rollback.

## Verified current test deployment, version 136

Owner-authorised permanent hover-only Helper replaces the rejected version133
Summary split and next-guide presentation. Summary and priority width are restored.
Desktop popup order is Matrix (matching numbered Stat icon for Stats), then existing
icon/tag/name, then optional Admin text. No guide at rest. Popup accepts pointer
entry/reading/scrolling; exit, Escape, page scroll/resize, blur, view/scope changes
and completion dismiss it. No click pinning or automatic next guide.
Phone/no-hover devices hide the control and cannot activate the popup/highlight;
their stored preference and normal progress behaviour remain intact.

GitHub implementation 7881506abb0b87e71a4ddee711ee8a5a118b9a9d, test correction
e8c86105c5a5b7badc509fce00d5f92ec834def9, phone/scroll revision 956f20a89639b0d96c2e1007d4637292b08a206c,
and final viewport QA b73fd9e2468e06c3201fc6d747da57bd37752c1f, draft/unmerged PR #22.
PR CI 37098137653 and push CI 37098135080 succeeded on the final QA SHA.
Logs confirm **84 ordinary Chromium passes, zero expected failures**: two desktop
popup cases, four phone-exclusion cases plus existing baseline coverage. Two
desktop popup and four phone-exclusion viewport screenshots inspected. Isolated
catalogues/external-image stubs do not establish live art/device/gateway proof.

Local full checks pass: 30 regression files, build, 96 syntax files and 70 compiled
asset checks, plus offline inventory, affected links/whitespace and all 167 final
GitHub/Site source blob matches. Mapping code/evidence is unchanged. App DOM checks
also verify capability changes preserve preference and never open a resting guide.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_c1c5ec641578819180e83ef5b797ba2d |
| Site source SHA | 2c132ae636ca3a9e871c07d17ff8b9792f0890c3 |
| Deployment | appgdep_6ac08b8a78bc81918d52f739b1f2e85c, succeeded |
| Archive hash | sha256:50dfff697cb5c8c66022b6243ee782154a793ba7c788a70cc75248f2c652d810 |
| Environment revision | 11 |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Compatible rollback | Saved version133, source 6df463818e41a6dd8a866c3ea8ad5179aae844d2, explanation-aware backend |

Public audience, D1/bindings/secrets/auth and Admin content remain. No live Admin
writes, source requests, schema/migration, capture/cost/FD/calculation or save
change. Hover/toggle/reading never writes progress. Existing completion and reverse
Undo retain their handler; empty source-scoped Undo bookkeeping is normal.
Intermediate saved candidates134/135 were never deployed. Final136 and135 share
the same app archive;136 records the final viewport-QA source. No documentation-only
redeployment is needed. Code rollback preserves current Admin/player data and
restores the earlier Summary layout; never reset/restore stale Admin data or use
version131's older writable Skills backend once explanations exist.

Existing app/footer/Admin content acceptance remains complete. The hover-only
direction/permanent implementation/phone exclusion are explicitly owner-authorised;
actual new desktop UI acceptance remains pending. Version133's UI acceptance is
superseded, not marked passed. Hosting evidence stays separately blocked; release
preparation complete. Next is the new desktop check, then Discord Admin login #15
and pages.dev #32. Export/print and multiple characters remain deferred.

Only new manual check: refresh on desktop without clearing saves and open
Infographic for the class with existing explanation. Expect the old Summary and
no resting guide. Hover an icon: Matrix then icon/tag/name then optional text;
Stats show numbered icons. Move into text to read/scroll, then leave: popup closes.
Complete one step and reverse Undo: progress restores, no next guide opens.
Helper Off persists after reload and retains same-skill glow. No repeated Admin,
old app or phone Helper check is requested.


## Historical test deployment, version 133, Summary layout superseded

Live Infographic Helper is implemented in 468a4d9, with geometry/overflow fixes
in c70bf03e316ca7a196f86490e25130b929e745d4. PR CI 37095867355 and push CI
37095864493 succeeded; PR logs confirm 84 ordinary Chromium passes, zero expected
failures. Six Helper screenshots were inspected at desktop, 390px and 320px for
both classes, using isolated catalogues and deterministic external-image stubs.
No live icon, physical-device or hosting-identity evidence is inferred.

Local checks pass: 30 regression files, build, 96 syntax files, 70 compiled assets,
offline inventory, eight retained-order mappings, Markdown links and whitespace.
All 167 authoritative GitHub source blobs match the final Site source.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_ef75df7138dc81918cd6e74c2537ea32 |
| Site source SHA | 6df463818e41a6dd8a866c3ea8ad5179aae844d2 |
| Deployment | appgdep_6ac082226a348191b693672e05d2d2ab, succeeded |
| Archive hash | sha256:519aeeb9eb65b0c15ed9a720dbc779d0f3bb4153821bdc4cce6ed93e4c49f6bc |
| Environment revision | 11 |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Compatible rollback | Saved version 132, explanation-aware backend retained |

Public audience, D1/bindings/secrets/auth remain unchanged. No live Admin data or
Scouter requests, capture/cost/FD/calculation changes, save-schema change or
migration. Helper hover/toggle does not write progress; existing click/Undo remains.
Native deployment succeeded. Full new Helper owner acceptance remains pending;
version 132 Admin content/preview and earlier checks are already accepted.

Only new manual check: refresh without clearing storage, select the class with
saved explanation and open Infographic. Expect Helper on by default if no stored
preference, desktop 50/50, next target and existing heading. Hover a different
skill, expect all occurrences to glow and its guide/explanation to preview; exit
restores next. Hover a Stat to see its matching numbered icon. Existing completion
and reverse Undo should move/restore next. Turn Helper off and reload: preference
persists, old Summary layout returns and hover highlight still works.

## Historical accepted test deployment, version 132

Admin Helper explanation/preview increment deployed successfully, environment
revision 11. GitHub implementation 2414303900580c2f1bf8b85c079a41fd61c5533b has
successful PR/push CI, including 78 ordinary browser passes. Owner acceptance of
this increment is complete, reported 3 October. No live Admin data was edited.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_049078bf01ec8191a4675b5a8805c315 |
| Site source SHA | 0dd6709bafcd57ff10d42d6004e0fc7267bef4b6 |
| Deployment | appgdep_6ac0795db9ac81918b4464b442f4d3f3, succeeded |
| Archive hash | sha256:e3e3c34904ed52518823445f27254d13eb777c349f213764b68cb90551ffdbec |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |

Compatible rollback must retain the explanation-aware backend once this field is
saved; see helper-content-review.md. Do not use the older Skills writer or restore
stale data. Live Helper integration follows below; its acceptance is separate.

## Historical test deployment, version 131

Version 131 deployment succeeded on 3 October, preserving the public test
audience and environment revision 11. It changes only the footer copy; prototype
and documentation remain outside the Worker allowlist. This is native deployment
status, not signed-in app/gateway verification.

| Field | Current test value |
| --- | --- |
| Project | `appgprj_6aba0413861881918dc7fe10da066627` |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Saved version | `appgprj_6aba0413861881918dc7fe10da066627~appgver_88b3d380663c8191940a826d95862db6` |
| Version number | 131 |
| Site source SHA | `549f4a3ab8c9854d4ec44daf1a36bc11b9e0c688` |
| Deployment | `appgdep_6ac074cf086081918968afaccb72b447`, succeeded |
| Environment revision | 11 |
| Saved archive hash | `sha256:953abea33889184efc6b1385e58c0dbda5b5885ee0281d73bd563d87adc99443` |

The saved archive exists. No rollback rehearsal, binding/secret change, live D1
read/write or source calculation was performed. Code rollback from 131 uses
verified saved version 130, preserving Admin data and player saves.
Do not redeploy unchanged app output just to publish repository documentation.

## Acceptance and data preservation

All previously pending existing app/audit acceptance is complete by Soushi's
3 October report: visuals, native Import/no automatic downloads, progress/focus/
refactors, Admin recovery/revisions/diagnostics and earlier motion/audio checks.
Do not repeat them unless a later change affects them. No specific device/browser,
live destructive fault test or signed-in hosting proof is inferred. Helper visual
review and new login/release verification remain separate.

The current Worker trusts Sites identity headers. pages.dev must instead verify
Discord identity server-side and authorise the owner. OAuth application/callback,
credentials and verified owner Discord ID must be established under #15. Server
secrets remain server-only. Public local use remains available without login.

For Helper-content rollback, retain the explanation-aware backend even if the new
UI is reverted. Version 131's older writable Skills backend can drop explanations;
do not use it for a normal writable rollback once such content exists. See
[content review](helper-content-review.md). Never reset/restore stale Admin data.

Preserve all Admin-managed data: Skills/names/tags, priority pairs, captures,
cost/FD schedules, availability/settings, revisions and Helper explanations.
Use current data at cutover, not fixtures or this preparation snapshot. Verify
source/target identities, record counts/content and revisions, concurrent-edit
handling and compatible rollback before switching. If binding the same database
is unsupported, resolve the actual transfer and final-edit plan before proceeding.
Do not reset/replace data as a shortcut. Actual Cloudflare account, supported Pages
server/API/D1 route and secure credentials remain step 4 access prerequisites.

Old browser/player saves need no migration or transfer gate. Do not delete them.
Optional manual Export/Import stays available; do not require it for release.
Future optional Discord player sync is separate from Admin login/release.

## Validation and publication sequence

1. Re-read #30, #23, linked requirements, current PR/head and this plan. Record
   changes since the reviewed baseline; keep captures, calculations and saves intact.
2. Freeze the chosen scope and full GitHub SHA after Helper/login and unresolved material decisions.
   This is priority 4 after Helper/login; keep #22 draft/unmerged until tested
   release readiness establishes the documented merge path.
3. With Node 24.19.0 and locked dependencies, run `npm ci --ignore-scripts`,
   `npm run check` and `node scripts/review-asset-delivery.mjs`. The existing
   GitHub Tracker checks must pass on that exact SHA, including ordinary browser
   tests without hiding failures. Use `docs/rendered-qa.md` for local Chromium setup.
   Current counts are 30 regression files, 96 syntax files, 70 assets and 84 browser
   cases; report actual results for the chosen SHA, not these counts by assumption.
4. Record acceptance results and remaining explicit decisions against that scope.
   Do not claim live source/icon/device/gateway evidence from fixture screenshots.
5. For an authorised Sites increment, re-read the existing project/access state
   and use the Sites hosting skill's native workflow. Open the existing Site source
   with `site-workflow.mjs` before edits; retain its source result. Use its ordered
   checks/build, verified source push and archive packaging. Reconcile GitHub files
   with Site source; retain legitimate Site-only configuration. Do not copy private
   configuration/secrets into GitHub or bundle repository docs as public assets.
6. Save the matching verified source/archive, then deploy that saved version with
   the existing audience. Public test uses `deploy_site_version`; an unchanged
   archive-backed saved version can be reused. Preserve D1, bindings, secrets and
   environment revision unless a separate authorised change requires otherwise.
7. Poll the exact returned deployment ID until success/failure. Record literal URL,
   Site source, saved version/deployment IDs, environment revision and rollback
   in #30. A saved version or source push alone is not a successful deployment.
8. Refresh existing tracker/admin tabs without clearing storage. Apply the relevant
   short smoke checks below, record owner acceptance separately and retain the
   preceding known saved version. A test deployment is separate from the later authorised pages.dev release
   and its actual merge/deployment record.

## Manual steps remaining

No previously pending app/audit owner check needs repeating. The old hosting
proof remains blocked as documented. The #31 prototype direction and matching-Stat-icon decision are now owner-accepted.
The owner supersedes the Summary split with a permanent hover-only popup.
Only the new hover UI acceptance check remains after tested deployment.
Establish missing OAuth/owner identity and Cloudflare deployment
access when the documented steps reach #15/#32. Later changes need only affected
checks. Final post-Helper/login smoke tests belong to the step 4 release record.

## Rollback without losing data

Choose the preceding compatible saved version for each future app increment
before deploying it. Re-query its saved archive/source and current audience at
rollback time. Saved code rollback does not undo player/admin writes or restore
an old environment. Preserve browser saves, D1, bindings and secrets; refresh
all open tabs afterwards so they share the same code/locking protocol.

| Saved test version | Site source SHA | Saved version ID | Use and limit |
| --- | --- | --- | --- |
| 130 | `f4f6257d7402c8c9032593431509b250f5ee4393` | `appgprj_6aba0413861881918dc7fe10da066627~appgver_1302fe0b04848191ae8c4014872154c7` | Current baseline; possible rollback for a later compatible increment, not an approved release |
| 129 | `fd08d1728fb3f02f138929492ab8f8f47bc2e7a0` | `appgprj_6aba0413861881918dc7fe10da066627~appgver_9333c64b28a881918e979b5a578fe38b` | Recorded rollback for 130; removes only the optical icon offset and restores its earlier visual alignment |

Native version listing confirms both archive-backed versions exist. No rollback
was executed or rehearsed here. When rollback is needed, deploy the verified
saved version through native Sites, leaving tunnel bindings unspecified to retain
them, then verify the returned deployment status and read-only progress/admin
checks. If native deployment reports a configuration/data incompatibility, stop
and resolve that specific issue; do not reset data as a shortcut.

Older #30 batch comments record their own rollback limitations. Do not choose
an old pre-Ren or pre-revision build because its version number looks familiar.
A schema/storage/host change needs a separate compatibility plan. Player Import
can replace progress and discard undo; server backups/restores concern different
data. Neither is an automatic consequence of rolling back code.

For this documentation batch, revert its GitHub commit and status annotations if
needed. No Site rollback or player/D1 restore is required.

## Work still outside this batch

Hosting evidence stays blocked. All infographic export/print work is deferred by
owner decision on 3 October: expected use is low and it is not considered necessary.
It is not a release requirement or an active format/scope question. Revisit only
on a new owner request. This does not defer player backup Export/Import or the
existing interactive Infographic. Choose a target, budget planning, snapshots,
multiple characters, personal FD optimisation, invented RNG costs and combined FD
remain excluded/deferred. Further classes and optional player sync remain later work. Discord Admin login
is priority 3, and pages.dev release priority 4.
This plan adds no export, legend, login, migration, calculation or release feature.
