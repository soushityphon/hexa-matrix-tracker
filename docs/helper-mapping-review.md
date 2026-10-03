# Helper mapping and visual checkpoint, 3 October 2026

## Current owner review

Soushi chose **Keep this layout** after seeing the Matrix/50/50 prototype.
For HEXA Stat steps, Soushi chose **Show matching icon**: replace the location
diagram with the existing matching Stat icon, retaining the heading and optional
explanation. This resolves the missing Stat geometry decision without inventing
regular Matrix coordinates. Mapping/prototype review is complete; full Helper
integration, Admin content and Stat rendering are not yet implemented/deployed.
The checkpoint below preserves the evidence and initial proposal.

Priority 1 release preparation is reconciled with the latest #30 owner decisions.
The old hosting identity investigation remains explicitly blocked, not completed.
No new session/origin evidence is available; no repeat probes or access change.
This permits independent #31 mapping/prototype work without a hosting change.

## Existing mapping evidence

Both classes use Scouter core category and internal ordinal. Actual Hoyoung
capture rows establish skillCore1/2/3, masteryCore1/2/3/4, reinCore1/2/3/4 and
generalCore2/3. Janus uses the existing shared generalCore1 identity. Ren's retained
catalogue and all four response captures carry the same prefixes/ordinals. Existing
runtime catalogue nodes expose sourceKey and category/group; capture rows supply
coreId. Do not infer the ordinal from icon filenames: Hoyeong_10 is skillCore2,
Hoyeong_12 is skillCore3. Synthetic browser fixture IDs are layout stimuli, not
source evidence. Editable display names/tags do not determine positions.

| Category | Positions, centre outward | Current available nodes |
| --- | --- | --- |
| Skill | skill_1 to skill_6, up-left | Origin, Ascent; third skill in retained KMS orders |
| Mastery | mastery_1 to mastery_4, up-right | M1, M2, M3, M4 |
| Enhancement | enhancement_1 to enhancement_4, down-left | Four existing enhancements in source order |
| Common | common_1 to common_4, down-right | Janus, Hecate, Lotus; fourth unavailable |

All 18 geometry positions can be generated without a class branch. Skill positions
4–6 and common position 4 have no current source skill. Skill position 3 is unavailable
in retained GMS Lotus orders, available in KMS Taotie. No names/mechanics are assigned
to vacant positions. Keep unavailable nodes subdued. Janus remains a location node
although deliberately absent from bossing priorities. Completion never changes
location/availability. Use the full catalogue to preserve ordinals, then the selected
order's existing availability and Janus rules; never re-index a filtered list.

`node docs/prototypes/mapping-check.mjs` checks all eight retained class/region/world
orders: Hoyoung's four CAPTURED_GAINS sequences and actual KMS rows, Ren's four raw
captures. Checks include 18 unique slots, exact unavailable slots, reversed input
order, empty availability, duplicate/out-of-range/category mismatch refusal.
This is retained-source verification, not a new live D1/source audit.

## Exact unresolved mapping

HEXA Stat I, II and III appear in both classes' orders but are not any of the agreed
18 regular Matrix positions. No Stat coordinates or behaviour are invented.
Owner decision needed: how should Helper display a next/hovered HEXA Stat step?
One possible choice is its existing matching Stat icon outside the 18-node diagram;
this is a proposal only. That decision was subsequently resolved in the current owner review above.
A conflicting Admin category/core identity must be reported, not silently positioned.

## Prototype scope

[Self-contained prototype](prototypes/helper-preview.html) and
[static preview](prototypes/helper-preview.png) show generated X geometry, simple
centre, original Scouter icons, unavailable nodes, existing skillAccent colours,
generated icon/tag/name and 50/50 Helper/Summary placement. Blank explanation has
no placeholder inside Helper. A separate prototype-only control shows generic
example text, without storing or hard-coding real skill explanations. Another
control compares the owner-supplied central reference icon with the simple hex.
Ren display labels in this fixture come from the uploaded tracker reference;
Hoyoung labels use existing source. Figures/priority tiles are illustrative visual
stimuli, not source orders or changed calculations.

Prototype is outside the Worker asset allowlist and does not import into the app,
write saves, call APIs, complete checkpoints or alter Admin data. Helper-off sketch
is illustrative, not proof that the live app's unchanged layout is preserved.
Static 1200px preview was rendered and visually inspected. Script syntax and pure
class/Helper-off render paths pass. Native hover, responsive layout, real progression,
preference/availability, Admin content and click preservation are not implemented
or claimed tested. No Helper deployment. The shown visual direction is now owner-accepted; native
interaction/responsive/full-feature acceptance remains separate.

Show the prototype to Soushi before making subjective details permanent. The visual/Stat decisions above are complete; next is data-backed Admin
explanations and integration using existing revision safety. Do not advance login
or release ahead of Helper unless the owner changes sequencing.

## Reproduce the prototype

Run `node docs/prototypes/build-helper-preview.mjs /absolute/original-icons` with
original PNGs named as the retained Scouter URLs. General_2_0 uses the existing
General_2 icon override. No icon acquisition code or live source calls run during
generation. Original icons are embedded in HTML/SVG, so the delivered prototype
has no external image dependency. The supplied centre reference is retained
unchanged in prototypes/centre-reference.webp. Render SVG with Inkscape if desired.
Neither these files nor documentation are served by the Worker.
