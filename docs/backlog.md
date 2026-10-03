# Backlog index, 3 October 2026, Brisbane

This index reconciles older plans with head b8ee32a and the latest Issue #30.
It changes no feature, data or acceptance requirement. Read current issue bodies
and comments before acting. PR #22 stays draft/unmerged; main is older and
eventual release is unapproved.

## Audit order

1. Hosting identity: blocked/partial. Anonymous refusals and isolated guards pass;
   signed-in injection/spoof replacement and direct-origin assurance remain open.
   Obtain evidence before changing hosting. See [review](hosting-identity-review.md).
2. Asset delivery: review/tests complete in b8ee32a; retain existing policy.
   No app deployment. See [review](asset-delivery-review.md).
3. README/backlog cleanup: this documentation batch reconciles current behaviour
   and archives history. No app or hosting change.
4. [Release plan](release-plan.md): acceptance, commit selection procedure and
   rollback documentation complete. Actual release SHA/destination/approval remain
   pending; documentation does not select or approve them.
5. Infographic export/print: **deferred by owner decision, 3 October**. The owner
   expects little use and does not consider it necessary. Remove all export/print
   planning, format/scope questions and implementation from active work and release
   requirements. Revisit only if the owner requests it. Existing player backup
   Export/Import and the interactive Infographic remain unchanged.
6. Further classes and optional Discord sync: later review only, with verified
   data and material account/storage decisions first.

Audit steps 1–3 are implemented/resolved. Step 4's refactors, rendering, admin
revisions and diagnostics are implemented/tested; app increments are deployed
through version 130. Owner acceptance remains partial.

## Issue reconciliation

States were read from GitHub on 3 October. This index does not close issues or
silently complete historical acceptance checkboxes.

| Issue | GitHub state | Current interpretation |
| --- | --- | --- |
| [#30](https://github.com/soushityphon/hexa-matrix-tracker/issues/30), audit | Open | Current audit authority; hosting and acceptance remain open. |
| [#23](https://github.com/soushityphon/hexa-matrix-tracker/issues/23), product backlog | Open | Product/history authority. Its version 96 heading and version 101 comment are historical; #30 records later audit work. |
| [#3](https://github.com/soushityphon/hexa-matrix-tracker/issues/3), Ren | Open | Implemented/tested/deployed on the test branch, with four verified captures. Ren is no longer future work. Broader acceptance/release is separate. |
| [#4](https://github.com/soushityphon/hexa-matrix-tracker/issues/4), retrieval | Open | Bounded owner-triggered retrieval exists for both classes. The endpoint is undocumented; stable public API/universal acquisition is not established. |
| [#5](https://github.com/soushityphon/hexa-matrix-tracker/issues/5), preview | Open | Preview fulfilled through Sites Worker hosting. Its old after-merge/static-site plan must not trigger a second host or merge. |
| [#7](https://github.com/soushityphon/hexa-matrix-tracker/issues/7), patch priorities | Open | Named pairs, retained hidden levels and capture-owned schedules supersede fixed patch/catch-up assumptions. #30 declines detailed source UI in favour of one footer credit. Dated snapshots are evidence. |
| [#12](https://github.com/soushityphon/hexa-matrix-tracker/issues/12), detection/drafts | Open | Manual capture/review, source FD and saved-pair workflow exist. Background detection, automatic PR promotion and local skill-icon retrieval remain unconnected/deferred. September no-FD statements are historical. |
| [#15](https://github.com/soushityphon/hexa-matrix-tracker/issues/15), sync | Open | Deferred; public local use remains. No account/storage design is approved. |
| [#24](https://github.com/soushityphon/hexa-matrix-tracker/issues/24), [#25](https://github.com/soushityphon/hexa-matrix-tracker/issues/25), [#26](https://github.com/soushityphon/hexa-matrix-tracker/issues/26), levels/names/tags | Closed | Owner-accepted at version 75. Later Stat line-entry/presentation refinements remain separate #30 work. |
| [#27](https://github.com/soushityphon/hexa-matrix-tracker/issues/27), calculator/Summary | Closed | Version 83 refinements accepted. Older checkbox/days-only/no-date copy is superseded; later Janus scope/Next Upgrade copy follows #30. |
| [#28](https://github.com/soushityphon/hexa-matrix-tracker/issues/28), motion/music | Open | Implemented/tested/deployed. #30 accepts supplied audio, motion/readability, reduced-motion and Off checks. Other issue-specific visual/interaction coverage is not inferred. |
| [#29](https://github.com/soushityphon/hexa-matrix-tracker/issues/29), infographic | Open | Implemented/tested/deployed, with previous reported passes retained. Footer/layout/device checks remain separate. Later export is undecided in #30. |
| [#2](https://github.com/soushityphon/hexa-matrix-tracker/issues/2), Stat checkpoints | Closed | Historical scope. Later approved general-average Stat FD/line editing supersedes its old no-FD limitation without RNG costs or personal FD. |

## Acceptance still open

Use #30 batch comments for exact steps/evidence. Never clear storage, damage
records or perform live reset/restore to create test states. This is an index
of pending checks, not new release gates or approvals.

- Admin damaged-record recovery/read-only layout and ordinary owner access (100).
  With no damaged row, do not claim live failure-state acceptance.
- Inven attribution (110), Janus/numbered Stats/Next Upgrade UI (111), single source
  footer and Ko-fi image wrapping (113 and earlier #29).
- Native picker and fixed refresh/status behaviour (118), manual-only import
  confirmation/no-download flow (119), later refactor and unchanged-refresh
  draft/focus retention (120–123). Earlier 101/116 acceptance does not accept these.
- Admin revisions/conflicts/drafts (124–126) and diagnostics (127). Isolated
  SQLite/privacy tests pass; live destructive testing is not required.
- Thin Stat bars/right-side numbers (128) and broader class/world/device scenarios
  without specific owner reports. Version 127 entry functionality and version 130
  optical icons are accepted. Extra physical-phone acceptance is not required
  for the PC-focused bar/icon refinements.
- Signed-in identity/origin evidence. Owner access alone cannot establish
  non-owner header replacement or direct-origin isolation.

Accepted reports include normal save retention (99), historical export/import
(101), loading/Retry (103), retained view (104), Undo (105), compact controls (106),
revised conflicts (108), FD access (109), supplied phone/motion/audio checks,
version 116 retention, version 127 entry functionality and version 130 icons.
No particular device or exhaustive scenario coverage is assigned to these reports.

## Exclusions and later work

Do not build Choose a target, budget planning, snapshots/weekly comparisons,
personal FD optimisation, new optimal orders, Stat RNG cost simulation or invented
combined FD totals. Multiple-character work is deferred, including profiles,
selectors, migrations and preparatory architecture. Future direction is pick a
character, assign a class, then track it; this is not implementation approval.

Do not rewrite captures or fill missing schedules from current Skills. Detailed
source explanations, automatic player backup downloads and extra completion/RNG
notes are declined. Local skill icons wait for reliable permitted retrieval and
a supported delivery plan. Optional sync and class expansion require separate
material decisions.

## Historical evidence

[Archived README](development-history.md) preserves old batch notes and early
Hoyoung-only scope. [Scouter investigation](scouter-discovery.md) retains dated
acquisition evidence and superseded blockers in historical sections. Tests and
GitHub comments keep their dates/version limits. An old “next” sentence does not
authorise repeating completed work.
