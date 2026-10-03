# Helper Admin content, 3 October 2026, Brisbane

Issue #31 follows completed release preparation and explicitly blocked hosting
proof under #30. The regular mapping and prototype direction are already accepted;
do not repeat that visual checkpoint. This batch adds content editing only.

## Implemented behaviour

Admin Skills has one optional Helper explanation per skill, including Stats.
The field accepts up to 4000 characters, line breaks and paired **bold** markers.
It has no custom heading or enable toggle. Blank text means no explanation.
The inline content preview uses the existing icon, tag and long display name.
HTML and other markup remain text. Only paired bold markers within a line become
strong text; unmatched markers remain visible. Outer whitespace is trimmed and
Windows line endings are normalised. The existing overall API payload bound remains.

Explanations live in each existing admin_skills review_json row. There is no schema
migration, new table, generated explanation, data backfill or live Admin write.
Source refresh retains owner fields. Skills revisions and atomic SQL guards apply
to explanations. A fresh older client that omits the field preserves the saved
value; an explicit empty string clears it. Missing fields in legacy records remain
valid. Backups/restores retain the field. Hoyoung and Ren public catalogue nodes
and Stats expose it for the later Helper renderer. Priority schedules stay intact.

## Preview assessment and remaining work

A content preview fits cleanly into the existing Skills card and shares the safe
renderer that the live Helper can reuse. A generated Matrix/Stat-location preview
is deferred until the live shared location renderer exists, to avoid two competing
renderers. It remains optional and does not block full Helper work.

Historical scope of this content batch: no Helper control, default/preference, class support, progression, hover or click
integration is added here. The player views remain as before. Next is that live
integration under the accepted Matrix/50:50 direction and Stat-icon exception.
New field/preview owner acceptance is separate from existing app acceptance.

## Tested and deployed status

Implemented in GitHub 2414303900580c2f1bf8b85c079a41fd61c5533b, draft/unmerged PR #22.
Local full checks pass: 29 regressions, Worker build, 93 syntax files and 68
compiled assets, plus inventory/source parity/Markdown links/whitespace. Local
Chromium installation failed because its download was not a valid ZIP; no local
browser pass is claimed. GitHub PR 37093830550 and push 37093827978 both succeeded.
PR logs confirm 78 ordinary browser passes, zero expected failures, including the
new Admin test at all three widths. Three Admin screenshots were inspected.
These use isolated data and failed remote art, not live owner/session evidence.

Test version 132 deployment succeeded, environment revision 11. Site source
0dd6709bafcd57ff10d42d6004e0fc7267bef4b6, saved version appgprj_6aba0413861881918dc7fe10da066627~appgver_049078bf01ec8191a4675b5a8805c315,
deployment appgdep_6ac0795db9ac81918b4464b442f4d3f3. No live data writes, schema,
binding, secret, audience, auth or source/cost/FD/progress/save change. New field
and preview owner acceptance is now complete, owner-reported on 3 October. No full
Helper deployment is claimed by this historical content batch. Subsequent live
integration is documented in [integration review](helper-integration-review.md).

## Verification and rollback

Isolated SQLite and actual Admin DOM regressions cover save/reload, invalid content,
stale revision refusal, legacy omission, explicit clear, source refresh, public
catalogue exposure, backup/restore, class-switch draft retention, disabled textarea
during save, safe preview and recovery through Load latest skills. Native Chromium
coverage is added for typing a newline, formatting, HTML text, save, conflict draft
retention and layout overflow at the existing three widths. Record actual CI results
and deployment separately in #30/#31.

Once explanations have been saved, do not use an old backend that drops unknown
Skills fields as a normal writable rollback. Preserve explanation-aware validation,
catalogue output and omission handling when reverting the UI or later Helper code.
Do not restore a stale database snapshot or clear Admin data. The existing saved
version 131 remains evidence of the previous app, but is not a safe writable Skills
backend rollback after this new data exists. A compatible rollback retains this
backend and may remove only the new UI until the fix is ready.
