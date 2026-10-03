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
| Reviewed GitHub baseline | `e86caf02ecd4b95c8561f38a72f524f8f1769c46`, `restore-scouter-retrieval`, draft PR #22 |
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

## Verified current test deployment

Native read-only Sites calls on 3 October confirm active/public owner access
configuration, latest version 130 and this deployment's successful state. That
metadata does not test signed-in admin requests, live assets or gateway security.

| Field | Current test value |
| --- | --- |
| Project | `appgprj_6aba0413861881918dc7fe10da066627` |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Saved version | `appgprj_6aba0413861881918dc7fe10da066627~appgver_1302fe0b04848191ae8c4014872154c7` |
| Version number | 130 |
| Site source SHA | `f4f6257d7402c8c9032593431509b250f5ee4393` |
| Deployment | `appgdep_6abff2baf52481918069d978043a85ad`, succeeded |
| Environment revision | 11 |
| Saved archive hash | `sha256:6cdfe776186dc1f388d8ce5f117d142a062c13d35ab80585ad887150b9eaf21b` |

The saved archive exists. No deployment, rollback rehearsal, binding/secret
change, live D1 read/write or source calculation was performed for this plan.
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
   Current counts are 28 regression files, 90 syntax files, 67 assets and 75 browser
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
proof remains blocked as documented. Review the #31 prototype before full visual
implementation. Establish missing OAuth/owner identity and Cloudflare deployment
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
