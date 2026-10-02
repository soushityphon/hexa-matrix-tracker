# Repeatable rendered QA

Run `npm ci --ignore-scripts`, `npm run build`, `npx playwright install --with-deps chromium`, then `npm run test:browser`. GitHub Tracker checks runs the same browser suite after the existing regression/build/delivery checks and retains its HTML report, screenshots and failure traces for seven days.

The suite runs Chromium at 1440 x 1000, 390 x 844 and 320 x 800. Phone projects enable touch and mobile emulation. It renders the compiled Worker through a CI-only HTTP adapter with isolated catalogue/priority responses and fresh browser contexts. No live D1, admin writes, private identity, Scouter calls or player saves are used. Browser fixtures and the adapter live under tests/browser and are not bundled or served by the Site.

Hoyoung fixture orders/costs/FD are synthetic layout stimuli. Ren uses retained capture order/schedules with synthetic selection labels and saved progress. Both have a full/hidden selection and Heroic/Interactive choices for exercising the shared UI, not verifying live game availability or order accuracy. External artwork is replaced with a local PNG during normal checks and blocked for image-failure checks. Screenshots therefore establish layout, not authentic skill artwork or live hotlink delivery.

Coverage includes both classes/views, Update/World/class switches, hidden-skill preservation, completed checkpoints and Hide completed, long reviewed names, failed images, page/panel overflow, native FD Enter/Space/Escape and ordinary focus return, unchanged saved progress when opening explanations, compact pointer-target dimensions/centre hit testing and touch checkpoint/undo with unchanged inventory. Reports retain full-page baseline and long-name/image-failure screenshots plus target measurements. These are Chromium results at fixed widths, not physical Android/iOS acceptance. The checks do not impose a new 44px layout on owner-accepted compact controls.

## Owner/device checks still needed

Use the current public test tracker without clearing storage. Restore any temporary progress edits with Undo.

1. In Hoyoung and Ren, switch Tracker/Infographic, Update and World. Expect the selected class's own saved levels and resources, readable labels and no sideways page scrolling.
2. Check the footer credit once in each view, numbered/faded Stat artwork, Janus input and optional Summary inclusion. These remain the version 111/113 owner checks; CI fixture screenshots do not count as owner acceptance.
3. Tap a Stat square and its small cancel control when it is already unlocked with three known zero lines. Expect the intended action with no accidental editor/checkpoint action. Wider minimum touch-area decisions are separate.
4. Open an FD explanation, close it and use a hardware keyboard if available. Expect readable wrapping, focus inside the dialog and focus back on its opener after Escape or Close.
5. Review live artwork and connectors at your screen width. Motion/readability, reduced motion, Animations Off, audible music/mute/looping and real mobile playback remain the next separate Step 4 checks and #28/#29 acceptance.

No rendered fixture result proves the hosting gateway identity boundary, live source availability, audio playback or real-device ergonomics. Record implemented, automated-rendered, deployed and owner-accepted states separately in Issue #30.

## Known rendered failure

The dedicated `known focus loss after native browser-chrome cycle` cases are marked expected failures for Issue #30. Tabbing from the modal's single Close button through Chromium browser chrome and back fires the app's window-focus refresh. Rebuilding the priority DOM disconnects the original FD opener, so Escape does not restore focus to its replacement. Ordinary Enter/Space, Close/Escape and focus return are checked separately. An unexpected pass fails CI, prompting removal of the expected-failure marker once fixed. Carry this forward to Step 4's priority rendering/focus work; do not count these cases as passing or owner acceptance.
