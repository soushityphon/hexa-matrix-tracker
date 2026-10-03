# Eventual release and rollback plan

## Status, 3 October 2026, Brisbane

This is a planning/documentation result under Issue #30, not a release approval.
PR #22 must stay **draft and unmerged**. The existing public test Site remains
separate from eventual release even though Sites calls its deployment production.
No release commit, release destination or migration is selected by this plan.

| Item | Evidence or state |
| --- | --- |
| Reviewed development baseline | `b2ff5bc49803ae9b26687bf5c7f165e20e198578`, `restore-scouter-retrieval`; not an approved release SHA |
| Last app change | `dd490f685cf65f2229e543d52acde8a6f192b996`, resource icon refinement |
| Subsequent changes | b8ee32a adds asset tests/docs; b2ff5bc cleans docs; neither changes build inputs |
| Eventual release commit | **Not selected.** Record the full immutable GitHub SHA after scope/approval and any final fixes |
| Eventual release destination | **Not approved in this audit.** Do not infer it from an old issue or brainstorming |
| PR state | #22 open, draft, unmerged |
| Owner acceptance | Partial, as indexed below; no blanket acceptance |
| Hosting identity evidence | Partial/blocked; not an established live vulnerability |

Before an eventual release, record its full GitHub SHA, branch/PR, included scope,
exact CI runs, acceptance results or explicit owner deferrals, target host/audience,
Site source SHA and saved/deployed version if using Sites, environment revision,
known rollback and owner release/merge authorisation in #30. A GitHub SHA and a
Site source SHA are different repositories' identifiers; do not substitute them.
Any code/data/build-input change after validation needs appropriate new checks.

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

## Acceptance before release selection

Reconcile the latest #30 comments against this table before acting. Owner reports
must remain separate from isolated tests and phone emulation. The owner decides
whether remaining manual checks are completed or explicitly deferred for the
chosen release scope; this plan cannot silently waive them or require new product
features. Already accepted checks need no repeat unless a later change affects them.

| Area | Existing evidence | Remaining acceptance/evidence |
| --- | --- | --- |
| Saves, Retry, retained view, Undo, conflict choices, FD access | Owner reports for 99/101/103–106/108/109; regression and Chromium coverage | Later native picker/manual-only import flow (118/119), refactor/unchanged-refresh draft/focus behaviour (120–123) remains unaccepted |
| Janus, Stat artwork, source/footer copy | Implemented/tested/deployed; 127 footer/entry functionality accepted | 110 attribution, 111 Janus/numbered Stats/Next Upgrade, 113 single source credit and Ko-fi image/wrapping checks remain |
| Stat entry and priority headings | 127 entry and 130 optical icon refinement owner-accepted; automated geometry/interaction checks | 128 thin bars/numbers visual check; wider class/world scenarios not implied by one report. No extra physical-phone check required for these PC-focused refinements |
| Admin recovery, revisions and diagnostics | Isolated SQLite/API/admin DOM fault/conflict/privacy tests pass | Ordinary owner read-only access, 100 recovery layout when present, 124–126 draft/conflict behaviour and 127 diagnostics acceptance remain separate; no live corruption/reset/restore needed |
| Motion, audio and compact touch controls | Supplied phone/motion/reduced-motion/Off/audio checks owner-accepted; Chromium media mechanics pass | Remaining #28/#29 layout/interaction coverage is not inferred from those reports |
| Hosting | Twelve historical anonymous app refusals; isolated guards and current native metadata | Trusted signed-in injection, authorised non-owner spoof replacement and direct-origin assurance remain open before any hosting change |

No known calculation/data-integrity problem may be deployed merely to make a
release available. Use [hosting evidence](hosting-identity-review.md),
[rendered QA](rendered-qa.md) and [backlog](backlog.md) for exact limits. Generic
403s, service bypass tokens, metadata and synthetic trusted headers cannot prove
the signed-in gateway boundary.

A different host/domain needs its own reviewed authentication, D1/data preservation
and rollback plan before implementation. The current handler trusts the Sites
identity header and must not be copied to an untrusted origin unchanged. Existing
local progress belongs to the browser's current origin; a host move must not promise
that it transfers itself. The existing manual Export/Import is available, but no
host migration, Discord authentication or account sync is approved here.

## Validation and publication sequence

1. Re-read #30, #23, linked requirements, current PR/head and this plan. Record
   changes since the reviewed baseline; keep captures, calculations and saves intact.
2. Freeze the chosen scope and full GitHub SHA after the required owner decisions.
   Keep #22 draft/unmerged until explicit authorisation changes that restriction.
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
   preceding known saved version. A test deployment does not approve eventual
   release, PR merge or a new host.

## Short owner checks for the current pending work

These combine existing checks without creating a new mandatory destructive test.
Keep current storage. Restore any voluntary temporary progress edit with Undo.

1. Refresh, switch Hoyoung/Ren and Tracker/Infographic, then refresh again. Expect
   each class's levels, Stat lines/unlocks, resources/settings and figures to remain.
   Open a Stat editor without changing it: thin bars and numbers share a row.
   Check Janus in Tracker and optional Summary inclusion in both views; priority
   order/FD must not change when the Summary option changes.
2. Scroll to each view's footer. Expect one MapleScouter credit, A project by Soushi
   and the original Ko-fi button. Open an existing completed Stat FD explanation
   and expect the Inven general-average wording. No progress edits are needed.
3. Export current progress manually; choose that valid file through Import. Expect
   the overwrite confirmation. Cancel must preserve progress and download nothing.
   Confirming the freshly exported unchanged file is optional: included classes
   should restore without another download. It intentionally clears their previous
   infographic undo history, so skip confirmation if that history must be kept.
4. Focus an existing Stat input, switch away for over 30 seconds, return and wait
   for an unchanged successful refresh. Expect editor/input focus retained and the
   bottom notice to leave panels in place. Open/close an FD dialog and expect focus
   back on its value. Source changes are tested in isolated fixtures, not live edits.
5. Open Admin Panel via normal sign-in; switch class and Skills/Priorities read-only.
   Expect existing names, availability and records. A damaged section, if present,
   should coexist with valid records and offer its raw download. Do not Save, Grab,
   Delete, Restore or Reset for this check. Admin conflicts use isolated tests or
   the earlier optional #30 owner steps, not a required live race here.

None of these steps establishes signed-in non-owner spoof replacement or origin
isolation. Record which steps were actually checked, and any existing-state checks
that were unavailable, rather than a blanket “all accepted”.

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
remain excluded/deferred. Further classes and optional sync remain later work.
This plan adds no export, legend, login, migration, calculation or release feature.
