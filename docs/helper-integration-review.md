# Live Infographic Helper, 3 October 2026, Brisbane

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
explanation. Below 780px the halves stack. Off retains the metric layout. Shared
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
