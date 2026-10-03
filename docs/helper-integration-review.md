# Hover-only Infographic Helper, 3 October 2026, Brisbane

## New owner decision and implementation

Soushi rejects version133's Summary split and authorises a permanent hover-only
popup without another prototype gate. This replaces the 50/50 Summary and automatic
next-step guide. The pre-Helper Summary structure/metrics and full-width priority
grid are restored. The control sits beside Hide completed in Upgrade Priority.

Popup order: Matrix with verified target at top, existing icon/tag/name below,
optional Admin text below that. Stats use the matching existing numbered icon.
Blank text is omitted; paired bold/lines retain the safe renderer. Existing Matrix
mapping, source icons, locks/availability and completion-independent geometry stay.
Admin content, class support and explicit browser preference are unchanged.

No guide at rest. Mouse/pen hover dwells 150ms before opening. Same-skill glow is
immediate and works with Helper off. A 180ms exit grace lets the pointer cross into
the popup; it stays open for reading/scrolling and closes after leaving both.
Escape/blur, page scrolling/resizing, view/class/scope changes and completion close it without pinning or
opening a next guide. The owner explicitly excludes Helper from phones. Devices without a primary fine
pointer that can hover hide the control and disable popup/highlighting activation.
Their stored preference stays intact. Pointer capability changes dismiss the popup
and update availability without writing a preference. Touch never repurposes completion.

Fixed popup stays inside viewport bounds. Prefer beside the source icon, otherwise
above/below with bounded height so the source stays clickable. Text and popup scroll
when needed. Scrolling inside the popup never repositions it or resets its scroll.
Page scrolling dismisses stale hover. Existing checkpoint handler runs unchanged; hover/control/read actions
never write progress or Admin data. No schema/binding/auth/source/calculation change.

Meaningful app and Chromium checks cover no-rest display, dwell/exit/reading,
content order/safe formatting, long-text wheel scrolling, viewport bounds, original
Summary geometry with on/off, same-skill glow, Stat icons, native completion/reverse
Undo, preference reload, unsupported class, touch/view dismissal and progress safety.
Record actual CI/deployment/new owner acceptance separately in #30/#31.

Rollback is saved version133 with the explanation-aware backend; it restores the
rejected Summary layout but preserves current Admin explanations/data. Do not use
version131's older writable backend once explanations exist or restore stale data.
Admin editing and prior app/footer acceptance are complete. New hover UI acceptance
remains pending. Next is that affected check, then Discord Admin login #15 and
pages.dev #32. Hosting proof remains separately blocked. Export/print and multiple
characters stay deferred.

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


## Historical version133 evidence, superseded UI

# Historical Summary Helper, version 133

## Behaviour and scope

The Matrix/50:50 layout and matching Stat-icon direction are owner-accepted.
Version 132 Admin explanation editing is now owner-reported accepted. This batch
integrates that content into the player Infographic under #31 and #30's order.

Helper appears only in Infographic. A class supports it when at least one catalogue
skill/Stat has non-blank content. Supported classes default on without writing a
preference. Explicit on/off is remembered in the browser; unsupported classes have
a disabled control/message and preserve the preference. No extra class setting.

Summary splits 50/50 on desktop: Helper left, existing Summary right. The generated
Matrix sits beside the existing icon/tag/long-name heading and optional scrollable
explanation. Below 780px the halves stack. A bounded panel height keeps priority tiles stationary
when hover changes between Matrix, Stat and different explanation lengths.
Long content scrolls. Off retains the metric layout. Shared
safe rendering handles lines and paired bold, never HTML. Blank content is omitted.
Stats replace the Matrix with their matching existing numbered icon. All-complete
shows that status and a diagram without a selected node.

Next uses the same displayed first-incomplete checkpoint as Infographic. Hover
previews another skill and subtly glows every occurrence with its existing accent,
even with Helper off. Exit restores next. Click retains existing completion/undo
and restores the new next. Hover/control changes do not write player progress;
Helper preference is separate from save/backup schemas. Source pauses keep the
retained read-only guide. No live Admin edit or generated explanation.

## Geometry and data

helper-matrix.js promotes the approved class-agnostic geometry. Prototype mapping
re-exports it. Category/group plus semantic sourceKey ordinal chooses 18 positions.
Existing selected priority determines available skills; Janus keeps its existing
always-present location. No second release list, manual coordinates or filename
inference. Completion never changes positions, availability or icons. Vacant nodes
stay locked; target border/glow uses skillAccent. No text inside nodes. Invalid,
duplicate, category-mismatched or out-of-range cores refuse the diagram with a
review message instead of guessing, while heading/content remain.

Browser fixtures now use verified skillCore2/3 semantic IDs instead of synthetic
filename-like 10/12. Only test stimuli change. The retained eight-order mapping
check remains source evidence. Costs, FD, captures, priorities and player saves
remain unchanged. Admin data includes current and future explanations.

## Checks, rollback and remaining work

New actual-app DOM checks cover default/preferences, unsupported classes, blank
content, locks/mapping refusal, safe rendering, hover/restoration, click/reverse
undo, Stats, class switches, completion and no progress writes on hover/toggle.
New Chromium cases cover both classes at three widths, desktop equal columns,
overflow, click/undo, preference reload, unsupported class and Off metric geometry.
The first CI found hover movement from varying Helper height and a narrow existing
world-label overflow. c70bf03 fixes stable height and wrapping at 380px or below;
new browser assertions retain ordinary pointer hit testing and stationary grid.
Record actual final CI, screenshots and deployment separately in #30/#31.

No schema/binding/secret/audience/auth change, Scouter call, live Admin write or
save migration. Compatible rollback is saved version 132, retaining the new
explanation-aware backend/data. Never reset/restore stale Admin data or use version
131's older writable Skills backend once explanations exist. Optional full Admin
location preview remains outside this batch; existing content preview is retained.

Full live-feature owner acceptance remains pending. Discord Admin login #15 follows
Helper, then pages.dev #32. Final release commit/deployment stays at step 4. Hosting
identity proof remains separately blocked. Export/print and multiple characters
remain deferred.

## Verified current test deployment, version 133

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

