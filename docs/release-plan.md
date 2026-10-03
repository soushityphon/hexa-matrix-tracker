# Eventual release and rollback plan

## Release complete, 4 October 2026, Brisbane

The tracker is live at https://hexa-matrix-tracker.pages.dev on tested app commit
6ab7c1cc189a34c563d956f52870b8640f44fd4e, Cloudflare deployment
5f2637eb-952b-4ede-9332-0cce5d88143a successful.
PR22 merged into main at53541a4fc1599ed34a516ffb42cc677780a091bf.
Reviewed head0f3385c had successful push CI37133071291 and PR CI37133074885;
the merge has the same file tree. Six Markdown files are the only differences
between deployed app and reviewed PR head, so no app redeployment is required.

Owner sign-in/logout, real alt-account refusal, functional Admin data, dropdown
sorting and stored session-cookie attributes/scheduled eight-hour expiry are
accepted. Cookie evidence is owner-reported, not an elapsed eight-hour expiry test.
Admin-data acceptance is functional testing plus earlier preparation-transfer
comparison, not a new final raw-data export. See
[production record](pages-production-record.md) for current evidence and
same-database rollback. Old preparation-only/pending/draft statements below are
historical where superseded here. Old Sites identity evidence remains separately
blocked. Optional sync, more classes, multiple characters and export/print stay deferred.

## Independent Pages preparation, 3 October 2026, Brisbane

The test Site remains142/env14, no new deployment or live data/configuration change.
Helper and real owner/non-owner/logout/public acceptance remain complete.
Live browser-cookie attributes cannot be inspected through the available connector;
that check remains pending, not inferred from owner login or isolated tests.
Cloudflare plugin discovery returned no connector; no authorised account route,
actual project/bindings, current-data cutover or Cloudflare compilation is verified.
Continue independent preparation while retaining these release gates.

Pages preparation adds an all-route Function adapter that enforces Discord mode,
private output and a read-only raw Admin snapshot comparator. The adapter reuses
the existing Worker and does not change the deployed Sites app. No public Admin
HTML/server files are static fallbacks. Preview uses isolated data, not live D1.
See [Pages guide](pages-release.md) for secure setup, exact raw-data/revision
comparison, final-write handling and rollback after target writes.

Local31 existing regression files plus2 new preparation suites, build,
104 syntax files,70 compiled assets, offline inventory and whitespace pass.
These are isolated Node tests, not Cloudflare compiler/runtime/live OAuth proof.
The old142 implementation CI37110963821 was cancelled; superseding docs-head
CI37111097574 on e81d0a6 completed successfully. No new browser count is inferred.
CI for this new preparation batch is recorded in #30/#32 when returned.
PR22 stays draft/unmerged, final release SHA and deployment belong to #32.

- [x] Pages adapter/private output and exact snapshot comparator prepared/tested locally.
- [ ] Live browser-cookie verification.
- [ ] Cloudflare access/compiler/runtime/bindings verification.
- [ ] Actual current Admin-data cutover and compatible rollback.
- [ ] Final Pages release and new-origin verification.

## Historical denial copy and non-owner acceptance, version142

Soushi confirms the alt account displayed deliberate non-owner refusal on141.
Real owner sign-in/logout/revisit, signed-out public access and real non-owner
refusal are now owner-reported accepted. Do not repeat these checks for this
wording-only change. Browser-cookie/security verification remains unresolved.

[Implementation 1cefd68](https://github.com/soushityphon/hexa-matrix-tracker/commit/1cefd68b3853ce6b7be7b7b801e591ce1138d922)
removes only the second sentence. Exact new response:
**This Discord account is not authorised for Admin.**
Status403, owner allowlist and state/session clearing remain. No flow/layout/
style, calculation/capture/priority/progress/player-save or Admin-data change.
No runtime secrets/bindings/schema/audience/source acquisition change.

Focused auth suite, exact compiled-response copy check, hosted full31 regression
files/build/99syntax/70asset checks and whitespace pass. All199 local source files
match repo/hosted checkout before this docs-only record.
[CI37110963821](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37110963821)
is still running at this record; no new browser-pass count is claimed.
Prior141 CI remains dated evidence for its own source only. No new live test or
cookie/security proof is inferred. Do not repeat accepted manual checks.

**Deployed142 succeeded**, unchanged environment **14**:
- Saved version: `appgprj_6aba0413861881918dc7fe10da066627~appgver_03c4c626f194819188e6fe821e5ae1b7`.
- Source: `6614a0f81c6b5ac92906b2e5a388f41533d9e6e3`.
- Deployment: `appgdep_6ac0c1cfeba881918776288b6a031870`.
- Archive: `sha256:fc7f205820889878079db69284da263b2515605b4203ad7133e14e0d7ac257da`.
- URL: https://soushi-hexa-matrix-test.xsoushi.chatgpt.site.
- Compatible rollback: saved141/source69634124b4a19e35522259bb9c9c145d27cb7525 with Discord env14 and current data.

No main/Pages release; PR22 draft/unmerged. Docs-only record needs no deployment.
Next: remaining browser-cookie/security verification, then Pages32. Old-host
identity proof stays separately blocked. Optional player sync is later; Helper
complete. All current/future Helper explanations and Admin data preserved.

- [x] Shorter refusal wording implemented/tested/deployed.
- [x] Real non-owner OAuth refusal, owner-reported accepted on141.
- [ ] Browser-cookie/security verification.


## Historical Discord runtime correction, version141

Soushi reports140 still fails, not accepted. Recent native fixed diagnostics:
`Admin sign-in failed token request 0`, before any Discord HTTP response.
Cloudflare [workerd source](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B)
explicitly rejects `redirect:error`; the higher-level Request docs list it.
Our code and Node/fake-fetch tests used/accepted that unsupported setting.
This establishes a runtime incompatibility matching the observed request-stage
failure, not a completed live owner login.

[Implementation 002ed47](https://github.com/soushityphon/hexa-matrix-tracker/commit/002ed4725c669b1a40e19db3cff3423b615cbc75)
uses `redirect:manual` on both fixed Discord API calls and rejects all3xx
responses before body parsing. No redirect is followed, credentials remain on
the fixed Discord destinations, and rejected responses grant no Admin session.
Tests exercise301/302/303/307/308 at token and identity stages, no subsequent
request, no session and fixed stage/reason/status diagnostics. Required
User-Agent, deadlines/body limits/state/cookies/owner/origin safeguards remain.
Neutral Admin Panel / Sign in copy stays. No secret re-entry or OAuth setup change.

Local31 regression files, build,99syntax/70compiled-assets, offline inventory
and whitespace pass. Hosted build/syntax/assets pass. All199 local source files
matched repo and Site checkout before this docs-only record.
[CI37108805759](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37108805759) succeeds on002ed47, logs confirm84 ordinary Chromium passes. Default-build/browser and isolated auth tests are not live OAuth/device/cookie proof.

**Deployed141 succeeded**, environment **14**, unchanged configuration:
- Saved version: `appgprj_6aba0413861881918dc7fe10da066627~appgver_78ebfc8e46948191a98e31e2002837b5`.
- Source: `69634124b4a19e35522259bb9c9c145d27cb7525`.
- Deployment: `appgdep_6ac0b966fd908191879233621f149ee3`.
- Archive: `sha256:dc88ab032d470abe6ef28b4becd39ce195fffa4007d825e5eca19067a9bcb694`.
- URL: https://soushi-hexa-matrix-test.xsoushi.chatgpt.site.

- [x] Version141 deployed successfully with manual redirect mode.

Compatible code rollback is saved140/source68043cb11ad96d4f0b2e570b607be65564058480
with Discord env14 and current data, although it retains the known login error.
Never roll back to header-trusting138 while activated. No Admin/data/D1/schema/
binding/secret/audience/source/capture/calculation/progress/player-save changes.
No live Admin data reads or writes, new gateway/device proof or main/Pages release.
PR22 stays draft/unmerged. Final documentation record needs no deployment.

- [x] Unsupported redirect mode removed; redirects refused explicitly.
- [x] Security/full local checks and hosted build/assets passed.
- [ ] Real owner OAuth login and supplied owner ID verification.
- [ ] Real non-owner/cookie/logout/public checks.
- [ ] Owner acceptance of activated login.

Next: start a fresh Sign in from /priority-review.html, not an old callback.
Expect unchanged current Skills/explanations/priorities. If successful, Sign out
and revisit Admin, expect login page. Do not edit/reset/clear data. Real login
and acceptance remain pending, no success inferred from code/CI/deployment.
Helper complete. Old-host identity proof stays separately blocked; Pages32
follows verified Admin login. Optional player sync remains separate later work.


## Historical sign-in failure follow-up, version140

Soushi reports activated139 sign-in failed, not accepted. Native callback logs
confirm502 after state validation, without a reason for exchange/identity failure.
No root cause is claimed. [Implementation 7820a91](https://github.com/soushityphon/hexa-matrix-tracker/commit/7820a91e3955147e78ffa5eaad12f2f8aebace4d)
adds Discord's required application User-Agent to both API requests and fixed
server-only diagnostics: stage/reason/numeric HTTP status. No codes, tokens,
secrets, IDs, URLs, provider body or raw exception are logged. Logging failure
keeps safe refusal. This is API compliance plus a new diagnostic approach,
not a verified cure. Owner's new login copy is implemented: **Admin Panel**
and **Sign in** only, no provider explanation or Back to tracker link.
Discord authentication/allowlist/cookies/origin/deadlines remain unchanged.

Local31 regression files, build,99syntax/70compiled-asset checks and offline
inventory/whitespace pass; focused auth/sink tests rerun after final logging guard.
[CI37106161207](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37106161207)
succeeds on7820a91, with84 ordinary Chromium passes. Browser coverage exercises the default build, not real OAuth.
All199 local source files matched between repo and hosted checkout before the
docs-only final record. No fresh screenshot/physical device/owner-access proof.

**Deployed140 succeeded**, environment **14**, configuration unchanged:
- Saved version: `appgprj_6aba0413861881918dc7fe10da066627~appgver_6975a99a22f88191967969a32fd0774c`.
- Source: `68043cb11ad96d4f0b2e570b607be65564058480`.
- Deployment: `appgdep_6ac0ae2cfc7481918b313bfad72d516d`.
- Archive: `sha256:ce94be99085529b8059b9c66bffbd083d3d98f9fe4e44fbcca9c8f1850b434f3`.
- URL: https://soushi-hexa-matrix-test.xsoushi.chatgpt.site.
- Compatible rollback: saved139/source2ee2fbc8bf64e6c1683e24894c10c042080ea3ba with Discord env14 and current data. No header-trusting138 rollback while activated.

No live Admin read/write, source acquisition, D1/schema/binding/secret/audience,
calculation/capture/priority/progress/player-save change. All Admin data and
Helper text remain intact. No credentials re-entry required without new evidence.
PR22 remains draft/unmerged, no main/Pages release.

- [x] Neutral login copy implemented/tested/deployed.
- [x] Required API User-Agent and fixed private diagnostics implemented/tested/deployed.
- [ ] Real owner sign-in and supplied ID verification.
- [ ] Real non-owner refusal/cookie/logout/public checks.
- [ ] Owner acceptance of activated Admin login.

Next: start a fresh sign-in from /priority-review.html, not reload an old callback.
Expect Admin Panel → Sign in → provider consent → unchanged current Admin data.
If it fails, use the new fixed diagnostic to identify the stage/status before
asking for any configuration change. Login/security/acceptance stay unresolved.
Old-host identity proof remains separately blocked; Helper is complete. After
verified Admin login, continue pages.dev32; optional player sync remains later.


## Discord Admin activation, 3 October 2026, Brisbane

**Configured and deployed, live verification pending.** Soushi created the dedicated
application, supplied Client ID `1555838379550056469` and proposed owner User ID
`98039332970975232`, and reports the exact test callback saved. Soushi entered
`DISCORD_CLIENT_SECRET` through ChatGPT Sites settings as a secret. Connector
metadata confirms its presence/type at environment revision13; its value was not
read or printed. The agent generated a fresh random32byte session key and stored
it as a runtime secret, set the exact test origin/client/owner and
`ADMIN_AUTH_MODE=discord`. All existing runtime keys were preserved.

The unchanged, archive-backed **saved version139** was redeployed successfully:
deployment `appgdep_6ac0ab0b971481919e2cad5d2667d1a1`, environment revision **14**,
URL https://soushi-hexa-matrix-test.xsoushi.chatgpt.site.
Saved version `appgprj_6aba0413861881918dc7fe10da066627~appgver_f69cf1a76cc48191847d71055cef2433`, source
`2ee2fbc8bf64e6c1683e24894c10c042080ea3ba`, archive
`sha256:a65d2fb4eb5455d079153fe0b93abc13afefa43b6d5a5d2ddc8b80fa61636875`.
This is configuration-only activation, no new app code/build/archive/version.
Implementation692fa21 and its recorded31 regression/99syntax/70asset/84browser
passes remain the automated evidence for this unchanged source, not live OAuth
or cookie proof. No extra tests or public/Signed-in request probes were run.
This documentation update needs no deployment. PR #22 stays draft/unmerged.

- [x] Dedicated app IDs/callback supplied and secret saved securely.
- [x] Discord mode/session key/origin/allowlist configured, env14 deployment succeeded.
- [ ] Verify the supplied owner ID via a real successful Discord OAuth exchange.
- [ ] Real owner/non-owner refusal, cookies/logout and public tracker verified.
- [ ] Owner acceptance of activated Discord Admin login.

Next owner check: open `/priority-review.html`, choose Continue with Discord,
and sign in as the supplied owner. Expect current Skills, explanations and
priorities unchanged. Sign out, then revisit Admin, expect the sign-in page.
Public tracker should still work signed out. No edits/reset/save-clear required.
Separate non-owner OAuth/refusal and browser-cookie/security verification remain
unresolved until actual evidence exists; owner success alone cannot complete them.
Old Sites header authentication is no longer Admin authority in Discord mode.

Preserve all Admin data and current/future explanations. No D1/schema/binding,
source/capture/calculation/progress/save/audience change. Rollback must retain a
Discord-aware backend and Discord mode with current data. Version138 is no longer
a compatible auth rollback while activated. Version139/source above with env14 is
the current compatible baseline; do not restore an older header-trusting Worker.
Old hosting identity proof stays separately blocked, optional player sync awaits
material decisions, and pages.dev release #32 follows verified Admin login.
When changing origins, add its exact callback to this same Discord application
and configure the new origin in #32; do not migrate/reset Admin data by assumption.
Older dormant/configuration-blocker statements below are historical.


## Historical dormant Discord Admin preparation, version 139

Implementation [692fa21](https://github.com/soushityphon/hexa-matrix-tracker/commit/692fa21b8f5640383fee2d28b3d975382c256f76), draft/unmerged PR #22.
Server-side code exchange and Discord identity lookup, exact owner allowlist,
signed browser-bound state, eight-hour signed host-only session, origin/JSON write
guards, logout and failure deadlines are implemented. The server module is private.
Pages/Workers development hostnames cannot inherit Sites-header access.

**Discord is not activated.** Environment revision11 has no Discord configuration.
No runtime variables/secrets were changed. Existing Sites Admin access remains.
Verified owner ID, dedicated application/client secret/registered callback, live
OAuth/cookie/non-owner/logout tests and owner acceptance remain unresolved.
Soushi selected a dedicated tracker application; it has not been created by this batch.

Local full checks pass:31 regression files, Worker build,99 syntax files,
70 compiled asset checks, offline inventory and affected links/whitespace.
[PR CI 37101106002](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37101106002) and
[push CI 37101103221](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37101103221) succeeded on692fa21.
Logs confirm **84 ordinary Chromium passes, zero expected failures**, exercising
the current dormant/default build. New isolated server tests use fake Discord
responses and exercise owner/anonymous/non-owner refusal, signed-state/session
binding/expiry/tampering/duplicates, origin/key/application/allowlist changes,
CSRF guards, body limits/header-and-body deadline and logout.
These are not live OAuth, browser-cookie or hosting-gateway proof.
All170 authoritative files matched the saved Site source before this docs-only record.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_f69cf1a76cc48191847d71055cef2433 |
| Site source | 2ee2fbc8bf64e6c1683e24894c10c042080ea3ba |
| Deployment | appgdep_6ac098ab710081919d0940ce9d02b4f2, succeeded |
| Archive | sha256:a65d2fb4eb5455d079153fe0b93abc13afefa43b6d5a5d2ddc8b80fa61636875 |
| Environment revision | 11, unchanged |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Compatible rollback now | Saved138/source9ae921369177401e85695b5edfeb2be801ff5c32, only while Discord remains disabled |

No auth activation, live Admin reads/writes, schema/table/migration, D1/binding,
source acquisition, calculations/captures/priorities/player saves or audience change.
All current/future Helper explanations and Admin data remain preserved.
After activation, rollback must retain a Discord-aware backend and Discord mode,
not an older header-trusting Worker. This final docs record needs no redeployment.

Helper through138 is owner-reported accepted via “checked”; #31 is complete.
No Helper or old Admin/player check remains. Only live Discord setup/verification
is blocked: create the dedicated developer application, register the exact callback
in the setup guide, provide the public Client ID and numeric owner User ID, and
establish secure client-secret/session-key runtime entry. Do not post secrets in chat
or GitHub. Configure/activate only after those exist, then verify owner/non-owner/
logout/public access with read-only current Admin data. Optional player sync is
not implemented and awaits separate storage/privacy/conflict decisions.

Next is that #15 setup and live verification, then #32 pages.dev, with actual
Cloudflare access/data-cutover/release-SHA/URL/rollback verification there.
Old-host identity proof stays separately blocked; no repeat probes. Release
preparation remains complete. PR #22 stays draft/unmerged. Export/print and
multiple characters remain deferred.



## Owner acceptance update, 3 October 2026, Brisbane

Soushi reports version138 quadrant colours checked. Helper mapping, Admin content,
hover behaviour, larger popup, tooltip removal, compact Stat heading and quadrant
colours are owner-reported accepted. No Helper manual check remains. Older pending
notes below describe their historical checkpoints. Continue Discord Admin #15;
see [Discord login preparation](discord-admin-login.md). Hosting proof stays blocked.


## Owner adjustment, 3 October 2026, Brisbane

Soushi reports version136 works. Its hover behaviour is owner-reported accepted;
the new visual changes below have separate acceptance after deployment.
Remove native title tooltips from Infographic checkpoint buttons while retaining
their accessible level/action labels. Use a 460px popup, about 1.6 times the prior
280px width, with a larger Matrix, heading and readable text, bounded to the viewport.
For Stats hide the location area and start with the small existing icon/name
heading, then optional explanation. No duplicate large Stat icon.
Hover-only behaviour, phone exclusion, preference, completion/reverse Undo,
verified geometry and all progress/Admin data remain unchanged. Only the changed
size, absence of competing tooltip and compact Stat presentation need owner review.


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

## Current quadrant colour deployment, version 138

Implemented in [16cdfbc](https://github.com/soushityphon/hexa-matrix-tracker/commit/16cdfbc119dfb70b92c721608b11936dba230780), draft/unmerged PR #22.
Each polygon takes its colour from its existing category. Positions/order,
availability/locks, faded other nodes and the target skill-colour border/glow stay.

| Quadrant | Category | Fill |
| --- | --- | --- |
| Top-left | Skill | Purple, #5522cc |
| Top-right | Mastery | Dark pink, #882266 |
| Bottom-left | Enhancement | Blue, #336699 |
| Bottom-right | Common | Blue-grey, #666699 |

The four supplied in-game colour fragments were recovered and inspected.
These flat fills follow the samples; they do not reproduce game gradients.
No change to the centre, popup size/behaviour, compact Stat heading or phone exclusion.

Full local checks pass: 30 regression files, Worker build, 96 syntax files,
70 compiled asset checks, offline inventory and affected links/whitespace.
All 167 authoritative files match the saved Site source before this docs-only record.
[PR CI 37099753829](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37099753829) and
[push CI 37099751209](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37099751209) succeed on 16cdfbc.
Logs confirm **84 ordinary Chromium passes, zero expected failures**.
App tests assert all 18 slots retain their correct category style; browser tests
assert the four actual computed fills in both classes. Both enlarged Matrix
viewport screenshots inspected, including target/faded/locked treatment.
Existing hover/Stat/preference/progress/Undo/phone-exclusion coverage still passes.
Fixture artwork is not live game/art, physical-device or hosting-identity proof.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_70d7182b89dc819197abd3904471879e |
| Site source | 9ae921369177401e85695b5edfeb2be801ff5c32 |
| Deployment | appgdep_6ac092a96e408191838a59040562103b, succeeded |
| Archive | sha256:2d50e921ecc8941e9eb891890653f7a6c869a04ac746bf8e8bbc27fdea752680 |
| Environment revision | 11 |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Compatible code rollback | Saved version137, source 68f37c513a1177871e389ce327fa585b36a0a22b, explanation-aware backend |

No live Admin edits, source acquisition, calculation, priority, capture, progress,
player-save, schema, D1, binding, secret, auth or audience changes.
Rollback preserves all current Admin/player data; never restore stale data.
This final documentation record does not require another app deployment.

Soushi's “i have checked that” accepts version137's size, tooltip removal and
compact Stat heading. Earlier app/footer/Admin/hover acceptance remains complete.
**Only the new quadrant colours need owner visual acceptance.** Refresh without
clearing storage, hover a regular skill, and expect purple upper-left, dark pink
upper-right, blue lower-left and blue-grey lower-right with the target highlighted.
No repeated behaviour, progress, preference, Admin or phone check.
Next after this affected colour check is Discord Admin #15, then pages.dev #32.
Hosting identity proof remains blocked without new authorised evidence; release
preparation is complete. Final release SHA/publication stays in step4.
Export/print and multiple characters remain deferred.


## Historical owner-accepted visual refinement, version 137

Implemented in [b014bd2](https://github.com/soushityphon/hexa-matrix-tracker/commit/b014bd20cbcdc216ffb6a3f488228957059c57a4), draft/unmerged PR #22.
Removed Infographic checkpoint native title tooltips while retaining accessible
level/action labels. Helper width is 460px versus 280px, about 1.6 times wider,
with a larger Matrix, heading and text. Viewport limits and scroll behaviour remain.
Stats omit the location area and start with their small existing icon/name heading,
followed by optional explanation. No duplicate large Stat image.

Full local checks pass: 30 regression files, Worker build, 96 syntax files,
70 compiled asset checks, offline inventory and affected links/whitespace.
All 167 authoritative files match the saved Site source before this docs-only record.
[PR CI 37098973723](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37098973723) and
[push CI 37098971137](https://github.com/soushityphon/hexa-matrix-tracker/actions/runs/37098971137) both succeed on b014bd2.
Logs confirm **84 ordinary Chromium passes, zero expected failures**.
Two enlarged Matrix and two compact Stat viewport screenshots inspected.
Tests assert absent title attributes with accessible labels retained, actual 460px
desktop width, viewport bounds, small Stat heading/no location and prior interaction
safety. Existing phone-exclusion checks pass. Isolated fixtures are not live art,
physical-device or hosting-identity evidence; no repeat owner/device checks inferred.

| Field | Current test value |
| --- | --- |
| Saved version | appgprj_6aba0413861881918dc7fe10da066627~appgver_67335935fda88191bea5fad2fdb7b4cc |
| Site source | 68f37c513a1177871e389ce327fa585b36a0a22b |
| Deployment | appgdep_6ac08f7a43848191a2e3c4977a8596f2, succeeded |
| Archive | sha256:eeb9b46cdf60e07a7d3caa8196c3bf1f13ea36cb94fbd0f0420b7e4610494273 |
| Environment revision | 11 |
| URL | https://soushi-hexa-matrix-test.xsoushi.chatgpt.site |
| Compatible code rollback | Saved version136, source 2c132ae636ca3a9e871c07d17ff8b9792f0890c3, explanation-aware backend |

No live Admin edits, source acquisition, calculations, priorities, captures,
progress/player-save, schema, D1, binding, secret, auth or audience change.
Code rollback preserves all current Admin/player data; never restore stale data.
This documentation record does not require another app deployment.

Soushi's “it works” accepts version136 hover behaviour. Prior app/footer/Admin
acceptance remains complete. **Only this size/tooltip/compact-Stat visual refinement
has pending owner acceptance.** Refresh without clearing storage, hover a regular
skill and expect the larger Matrix popup with no competing plain-text tooltip;
hover a Stat and expect small icon/name plus optional text, without a large icon.
No repeat progress/Undo/preference/Admin or phone Helper acceptance check.
Next after this affected visual check is Discord Admin #15, then pages.dev #32.
Hosting identity evidence stays separately blocked; release preparation is complete.
Final release SHA/publication remains step4; export/print and multiple characters deferred.


## Historical accepted hover test deployment, version 136

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

The current version142 Worker uses activated Discord authentication; Sites headers
no longer grant Admin. Owner sign-in/logout/public/non-owner refusal are accepted.
Browser-cookie verification remains pending. Pages enforces Discord mode and must
verify its actual origin/callback/secrets/bindings under #32. Server secrets remain
server-only. Public local use remains available without login.

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
   Report actual counts/results for the chosen SHA; historical counts below are
   dated evidence, not an assumed result for a future release. Include Pages
   adapter/private-output and raw Admin snapshot checks.
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
The owner supersedes the Summary split with a permanent hover-only popup, fully
accepted through138. OAuth setup and owner/non-owner/logout/public checks are
accepted. Remaining live cookie metadata verification is separate. Establish
Cloudflare access and actual runtime/current-data/rollback verification under #32.
Later changes need only affected checks. Final new-origin smoke tests belong to
the step4 release record. No old Helper or login acceptance repeat is needed.

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
