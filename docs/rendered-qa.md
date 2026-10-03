# Repeatable rendered QA

Run `npm ci --ignore-scripts`, `npm run build`, `npx playwright install --with-deps chromium`, then `npm run test:browser`. GitHub Tracker checks runs the same browser suite after the existing regression/build/delivery checks and retains its HTML report, screenshots and failure traces for seven days.

The suite runs Chromium at 1440 x 1000, 390 x 844 and 320 x 800. Phone projects enable touch and mobile emulation. The current narrow world labels wrap, allowing the 320px layout viewport to fit. Overflow checks use the actual layout viewport; target measurements are CSS pixels, not proof of physical touch size. Coarse-pointer controls have a 28px minimum where needed; the Stat cancel target is 32px with the same small cross. The browser suite measures scaled target sizes and checks a 24px floor at the tested device widths. These measurements do not prove physical-device ergonomics. It renders the compiled Worker through a CI-only HTTP adapter with isolated catalogue/priority responses and fresh browser contexts. No live D1, admin writes, private identity, Scouter calls or player saves are used. Browser fixtures and the adapter live under tests/browser and are not bundled or served by the Site.

Hoyoung fixture orders/costs/FD are synthetic layout stimuli. Ren uses retained capture order/schedules with synthetic selection labels and saved progress. Both have a full/hidden selection and Heroic/Interactive choices for exercising the shared UI, not verifying live game availability or order accuracy. External artwork is replaced with a local PNG during normal checks and blocked for image-failure checks. Screenshots therefore establish layout, not authentic skill artwork or live hotlink delivery.

Coverage includes both classes/views, Update/World/class switches, hidden-skill preservation, completed checkpoints and Hide completed, long reviewed names, failed images, page/panel overflow, native FD Enter/Space/Escape and ordinary focus return, unchanged saved progress when opening explanations, compact pointer-target dimensions/centre hit testing and scaled mobile sizes and touch checkpoint/undo with unchanged inventory. Stat cancel checks exercise all four inner corners, closed-editor separation, ordinary Undo and unchanged inventory/lines/levels for both classes. Reports retain full-page baseline and long-name/image-failure screenshots plus target measurements. These are Chromium results at fixed widths, not physical Android/iOS acceptance. The checks do not impose a new 44px layout on owner-accepted compact controls.

## Backup and focus refresh checks

`backup.spec.mjs` checks both classes at all three widths using Chromium file chooser/change delivery and actual JSON downloads. Since a headless chooser has no OS window, its return-focus event is dispatched explicitly. Cancel leaves progress intact; confirmed restore replaces only the included class, restores exported progress and keeps the other class intact. Both cancel and confirmed import must create zero downloads; manual Export still downloads JSON. Picker cancellation restores ordinary focus refreshes. Separate checks assert fresh-cache focus performs no requests or pause, expired-cache focus pauses while requesting, and the fixed bottom status/Retry does not move the toolbar or panels. No physical OS picker or device acceptance is claimed.

## Real browser music checks

`music.spec.mjs` observes the browser's real detached audio element and GainNode, without replacing media playback, decoding or clocks. The original MP3 is served by the compiled Worker. A native range pointer gesture starts playback, the media clock advances and an analyser connected after gain must detect a nonzero signal. The browser must loop after seeking to half a second before the actual end, retain nonzero output, mute to zero output with paused playback, resume, rewind and silence on class switch, and remain muted after reload. Both class progress records must stay unchanged. Results include a JSON evidence attachment per viewport.

This is headless Chromium and phone emulation. The accelerated loop check establishes a decoded native loop boundary, not full-track listening or audible output from a speaker. Real iOS/Android audio policies and physical volume controls remain device checks. Owner-confirmed audible playback is independent evidence, not inferred from the analyser.

## Owner checks and new hover UI coverage

The owner accepts all previously pending app/audit checks and version132 Admin
content/preview. Do not repeat old Import, audio, Stat, focus or Admin checks unless
later changes affect them. Earlier device-specific evidence remains limited.

The new hover popup replaces version133's rejected Summary layout. Refresh without
clearing saves and open Infographic for a class with saved content. At rest, expect
the original Summary and no popup. Hover an icon: expect Matrix, icon/tag/name and
optional text in that order; Stats use matching numbered icons. Move into the popup
and scroll long text; expect it to stay readable. Exit closes. Click/reverse Undo
retains existing progress behaviour. Helper Off persists after reload, with hover
highlighting but no popup. This is the only new owner UI check.

Chromium uses isolated catalogue data and external-image stubs across both classes
and all three widths. Desktop native pointer/wheel checks cover popup reading, safe long
text, viewport fit, unchanged Summary geometry, Stats, click/reverse Undo and saved
preference. Phone cases verify the owner-requested Helper exclusion: hidden
control, no popup/glow activation and untouched preference/progress. Fixture checks do not prove live icons, physical devices or hosting
identity. Record implementation/tests/deployment/acceptance separately in #30/#31.

## Priority redraw and focus measurements

The `measured identical redraws and saves` cases instrument real Storage writes and direct priority/Next Upgrade child mutations. After initial loading settles, 100 no-op owned-inventory input events must produce zero class-progress writes and zero direct child replacements for priority, Next Upgrade, Summary, input/version containers and Stat FD, with original priority/Next Upgrade/Stat FD nodes retained. Each class/viewport attaches the counters as JSON evidence. The ordinary `FD focus survives unchanged expired-cache browser-chrome refresh` cases exercise the previous six expected failures: cache expiry, native Tab through browser chrome, return focus refresh, then Escape must focus the same priority FD opener. Their expected-failure markers are removed for this batch and CI must pass them ordinarily before deployment.

The invalid-draft cases enter an in-range non-integer Stat line, delay an expired-cache source refresh and check that the same input remains mounted, with its raw draft, custom validation, native focus and persisted progress retained after unchanged data succeeds. They also change inventory and confirm an existing Stat FD button survives and receives focus after modal close. Changed-source cases rename a reviewed display name, confirm the original priority opener disconnects, then check focus returns to its matching key. Removing source FD must return focus to the current view button. Both classes run at all three widths. App DOM tests also confirm that deliberate focus movement during a pending refresh is respected.

Changed class/order/source inputs retain the existing rebuilding and validation/migration paths. These tests do not promise to retain an unfinished input draft across changed source schemas or class/order changes. No live shared source is edited for testing. Owner acceptance and physical-device checks remain separate.

## Direct Stat entry and numeric replacement

Both classes run the owner-requested entry checks at all three widths. Segment 7 directly enters 7; keyboard activation enters 10; ordinary Undo restores 7. Native insertion after click/tap replaces an existing Stat, skill, owned-inventory or daily-income value without a manual selection command. Whole-value insertion of 999 or -1 retains the previous Stat draft; sequential typing cannot exceed 10. The persisted record, unchanged other Stat lines/class progress and reload restoration are checked. Each of the ten segment targets is measured for width/height and centre hits. The owner-requested side-by-side layout shows 10px bars inside 28px-tall buttons, with a 54px number field aligned on the right. Compact segments have a 16px width floor at the tested phone widths; the number field remains a larger alternative. The previous version 127 full-width targets met a scaled 24px floor. Read-only tile previews remain unchanged. The footer reads “A project by Soushi”.

Phone emulation and native Chromium insertion do not establish physical mobile keyboard/clipboard ergonomics. On the test Site, tap a numeric input and type a replacement, paste 11 into a Stat line and expect the prior value, then tap a segment and use Undo to restore progress. Existing total/integer validation remains, so a line edit that makes the three-line total exceed 20 remains an unsaved draft. Do not clear saved progress for these checks. Record owner acceptance separately.
