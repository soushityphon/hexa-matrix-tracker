# Scouter-led reconstruction, 30 September 2026

Issue #23 is the continuation authority. This investigation extends draft PR #22; test Site version 64 is unchanged. No D1 write, display-name edit, visibility change or browser-progress change was made.

## Concrete server request policy, latest continuation

`scouter-request-policy.js` implements the concrete review gate for the isolated capture path. `acquireReviewedScouterOrder` always installs that policy, ignoring a supplied `validatePrepared` callback, then requires exactly one zero-to-20 transition for each Stat I, II and III in the reconstructed response. The lower-level transport helper remains available for tests and specialised server policies; the future owner workflow should use the reviewed entry point.

The policy snapshots the body, catalogue and server review before asynchronous work. It checks all three class fields and reset values through the existing context helper, explicit region/world/material selectors, and complete core inventories derived from the discovered active skills and empty placeholders. Under the inspected frontend construction, top level intentionally omits General 1; nested groups contain active metadata cores and omit placeholders. Those asymmetries are valid, not missing-counterpart errors. Changed construction needs new source review. This does not change the existing runtime diagnostic's conservative warnings or gate.

Current wrapper policy requires exactly `myHexa`, `specEff`, `sole`, `merType`, `start`, `cycle`, `userStat` and `id`, with the observed current-enhancement options (`start:true`, `merType:1`, `cycle:"3"`), a nonempty ID and finite numeric efficiencies. It does not modify passive-skill statistics, character world, material prices or unknown fields. A different wrapper option requires investigated evidence and a policy update rather than silently accepting it.

Each private server review contains:

- Schema 1 and an explicit job, region and world scope.
- The complete inspected request path/type map, using JSON-quoted key segments to avoid path collisions. Unknown, removed or changed fields block even when they are not named like levels.
- Matching prepared-body, benchmark and reset fingerprints from the same body, plus a schema-scoped fingerprint of the full source catalogue. This binds source names, icons, schedules, placeholders and provenance, including capture dates. New acquisition provenance requires a new review even when skill data is unchanged.
- `benchmarkEvidence` with kind `genuine-job-profile-and-efficiencies`, matching job/region/benchmark fingerprint, capture time and separate genuine profile/efficiency evidence SHA-256 identifiers.
- `resetEvidence` with kind `controlled-all-three-stat-reset`, matching job/region/world and the exact prepared-body/reset fingerprints, response capture time/hash and `zeroToTwentyStats:[1,2,3]`.

`scouterPolicySnapshot` produces inspection inputs only. **It must not automatically approve them.** The review registry is a trusted server configuration boundary. Hashes prove equality, not authenticity: the developer must inspect genuine profile/efficiency construction, every field's semantics and the controlled response before installing a review. Never accept a browser review, turn an uploaded assertion into server evidence, or populate a review from a synthetic test. Policy results return fixed blocker codes only, without raw request values, field paths, identifiers or review records. Candidates remain `publishable:false`; semantic review does not grant a live-request budget or permission to save/publish.

No live review is seeded and no runtime endpoint invokes this entry point. Existing private templates are not cleared. Earlier KMS observations have response hashes but lack the new same-body and genuine benchmark evidence bindings; do not backfill those from labels or separate diagnostics. GMS semantics, genuine Ren benchmark construction and the 104-position Hoyoung drift remain unresolved. The normal request route, diagnostic gate and saved schema are unchanged. Both new policy and reviewed acquisition stay server-only in the build.

Validation: full `npm test`, Worker build, server-module syntax and whitespace checks pass. New synthetic tests cover expected asymmetries, missing/extra cores in either copy, unfamiliar fields, changed stats/efficiencies/prices/options/identity, scoped evidence mismatch, source drift, missing or incomplete Stat proof, immutable review snapshots, callback-bypass rejection before POST, private-output redaction and missing Stats after response. Four synthetic region/world reviews exercise scoping, not live regional or job support.

No new source/profile/calculation request, D1 access/write, secret operation, progress edit, deployment or merge occurred. Sites listing confirms test version 64 and public viewing with owner-restricted editing. No new owner UI test is required for this server increment. Deploy after the complete owner acquisition/review flow is ready, as recorded in #23.

Next: establish genuine request construction and reviewed field semantics from inspected public frontend/profile evidence, install only justified scoped server evidence, then connect catalogue acquisition and this reviewed capture to owner-only isolated comparison. Keep the two-call stop until a specific new experiment is justified. Old saved provenance remains unknown; preserve all seven records and separate display/visibility overlays during later reviewed promotion.

## Reusable isolated acquisition

`scouter-discovery.js` does not import the tracker catalogue, reviewed names, priority fixtures or Google Sheets. It reads public frontend metadata and exact cumulative cost arrays as literal data without evaluating downloaded JavaScript. It discovers job and shared core IDs, Korean source names, icons, categories, Origin/Ascent/Mastery tags, empty placeholders and complete level costs. Adjacent cumulative differences yield exact individual costs; aggregate checkpoint costs are never divided.

The acquisition command starts from current Scouter HTML, finds current chunk filenames, records source URLs, capture times and SHA-256 hashes, and discovers the HEXA page's explicit icon overrides. Source schema drift, missing schedules, conflicting icons or HTTP errors stop acquisition without retries. Frontend presence is a candidate inventory, not proof of regional availability.

```sh
node scripts/acquire-scouter-catalogue.mjs 호영 KMS Heroic > catalogue.json
node scripts/reconstruct-scouter-order.mjs catalogue.json response.json 2026-09-30T03:34:55.371350Z > reconstruction.json
```

Use Node's `--use-env-proxy` flag in environments that require its network proxy. For previously acquired public chunks, `scripts/discover-scouter-source.mjs` also accepts paths, source URLs and a capture date. That lower-level command requires a region/world selection and source icon overrides before order reconstruction.

Selections are explicit: GMS/KMS and Heroic/Interactive. Heroic uses Fragments (`sole:false`); Interactive uses Sol Erda (`sole:true`). This does not alter genuine character world fields. Reconstruction retains exact source order, checkpoint costs, raw levels, Stat level-20 normalisation, field-7 efficiency and field-8 relative FD factor. It checks cumulative arithmetic, fixed schedule totals and source identities. Display overrides start empty and output is always `publishable:false`. There is no order API call or storage write in these commands. Invalid FD values become null and a validation issue rather than copied arbitrary data.

All 14 Hoyoung skills and all 420 fixed level costs discovered from current frontend source match the reviewed tracker. Categories use core families; different cost tiers remain explicit schedules rather than assuming all Skill/Common cores have identical costs. Four metadata slots have empty icons and remain placeholders.

## HEXA Stat semantics

The public ranking UI and API were compared, rather than treating a rank as investment evidence. The observed ranking is labelled HEXA converted-stat ranking. The matching query is `GET /api/ranking?region=kms&job=호영&world=전체&page=1&pageSize=30`. Omitting `world=전체` gives a different population. `totalPage=17450` denotes entries; the frontend computes `ceil(totalPage/pageSize)`, giving last page 582.

The highest Hoyoung was 김치찌개네입, level 295. Genuine `GET /api/id?name=...&region=kms&preset=00000` data showed scalar `userStat.hexa.hexaStat:3`, `userApiData.hexaStat_opened:true`, and three grade-20 records with main/sub/sub levels `[9,5,6]`, `[9,4,7]`, `[9,5,6]`. The last entry on page 582 was 맛좋은얼박사, level 266, with scalar 0, opened false and an empty `userHexaStatData` array. These establish invested and observed-empty examples, not merely high/low ranks. Raw `slot_id` was 0 for each invested record; public tooltip code labels I/II/III by array index.

Frontend request construction merges the genuine `userStat.hexa` with the API's class, nested skill inventories, used materials and opened flag. The HEXA page sends `myHexa`, `specEff`, `sole`, `merType`, `start`, `cycle`, `userStat` and `id`. `start:true` means current enhancement; the after-reset UI uses false and was not used. `merType:1`, `cycle:"3"` and genuine calculated efficiencies were preserved. Character stats and passive options were preserved, not fabricated.

One controlled Hoyoung Fragment order request used that invested profile with both HEXA copies reset to Origin 1, all other present skills 0, scalar 0 and opened false. Full outgoing inventory/key sets, top-level and nested levels, class copies, region and numeric efficiencies were checked before sending. The response had 206 validated checkpoints and included **all three** Stats with `0→20` transitions, at positions 41, 58 and 73. Thus scalar 0 plus opened false puts all three Stats into the baseline for this genuine KMS request, even when the original profile had all three invested. Profile comparison alone does not prove backend reset semantics; `inspectStatEvidence` deliberately reports `backendResetProven:false`. The controlled response supplies separate evidence. Exact scalar meaning across partial investment, GMS and future Stat counts remains unverified.

## Controlled Ren substitution

The second and final live calculation changed all three observed class fields to 렌: `myHexa.character_class`, `userStat.hexa.character_class`, `userStat.stat.myClass`, and URL `class=렌`. Region stayed KMS, material Fragments, with the same checked empty skill/Stat baseline. Owner-confirmed `skillCore1` was Origin.

HTTP 201 was followed by content validation: 211 checkpoints, Ren source names, exact Len icons and core slots, matching `now_hexa` names apart from generic common-core label 공코3, and no Hoyoung name/icon residue. No explicit returned class field exists, so class consistency is derived from identities and absence of residue, not asserted from HTTP success. Hecate's response icon `General_2.png` differs from metadata `General_2_0.png`; the public HEXA page explicitly overrides that icon. Reconstruction discovers that override and both responses pass with zero issues.

Ren remains experimental: the retained stats and calculated efficiencies are Hoyoung's, and their fitness for a Ren benchmark is not proven. Neither Ren Interactive nor GMS Ren was requested. Exactly two live order calls were made in this investigation, no retries, and no 429/430 occurred. Further live calls stopped.

## Comparison and provenance

The isolated fresh Hoyoung order and saved enabled `taotie_heroic_20260928` each contain 206 checkpoints, but 104 positions differ. Saved source context says KMS Taotie Fragments, checked 28 September, training dummy. Fresh response reports `standard:허수아비`, `patch:밸패반영`, `hexa_updated:true`. There is no explicit patch version or returned class. The new baseline's Stat placements differ strongly from the earlier captured order. Request construction, benchmark character calculations, reset handling and capture date must be compared before attributing drift to a patch. Current GMS Lotus and KMS Taotie are distinct regional inventories; the existing public-source inventory findings were not re-investigated.

Field 7 remains efficiency per 30 Fragments; fixed checkpoint gain is `efficiency * checkpointFragments / 30`. Field 8 is retained as an observed relative factor, not assumed to start at 1. FD remains tied to the exact checkpoint, genuine benchmark, material order and capture. A source response never replaces reviewed display names or visibility automatically.

Public chunk evidence:

| Purpose | URL | SHA-256 |
| --- | --- | --- |
| Metadata | https://maplescouter.com/_next/static/chunks/6352-5519096e1b7f1ace.js | `79e9b26bbf98039dbafa62e5bcd652e1b2dba4feceb95b83a9f9d4513bc00b79` |
| Cost arrays and request wrapper | https://maplescouter.com/_next/static/chunks/7717-2a8c25f8bdabbd9d.js | `e69eb578dbc3c7baa0176e962bf6203bf4462019ea8b6f62cb4db9e7aa237ab2` |
| Stat tooltip numbering | https://maplescouter.com/_next/static/chunks/1454-ac826407e65cf914.js | `167c56026918d14643bce1a8a38b240d31c0dabface29b20da1b074c61bc43c1` |
| HEXA page icon overrides | https://maplescouter.com/_next/static/chunks/app/%5Blocale%5D/(pages)/hexa/page-6208c755243e6ff9.js | `5f81a6e656c02b7ee7dcf9939fe5efae3ca741d551e6c5e403d7d35b81717dcb` |

Original metadata/cost captures were 03:30 UTC; the acquisition command independently reacquired them at 03:42 UTC with the same hashes. Hoyoung response capture: `2026-09-30T03:34:55.371350Z`, hash `fea0b1cb47967654eb83892097f367e54a3062f2bb71da8e4b165a26bce3dc4d`. Ren response capture: `2026-09-30T03:35:55.925339Z`, hash `e0125935e0a4bdb2470eda4b8429e79d4f6d1b6d3ed85210aa3b7264efd5bc8b`. These hashes identify observations; raw full profiles, templates and keys are not committed. Do not rely on scratch captures surviving another chat.

## Remaining work

1. Feed acquisition into an owner-only server workflow with genuine profile/template provenance and full generic outgoing-body validation. Preserve raw templates and keys server-side; do not expose private profiles through candidate output.
2. Resolve partial-Stat scalar semantics and repeat the reset check for GMS when a limited request is justified. This KMS result does not globally clear the existing diagnostic's substitution gate.
3. Establish genuine Ren benchmark/efficiency construction, returned-identity checks and each region/material pair before supporting Ren in the tracker.
4. Reconcile saved versus fresh Hoyoung request context and FD, then design owner-reviewed candidate promotion with independent stable name/visibility overlays. Keep existing D1 orders until review.
5. Record an explicit patch/version label when a Scouter source supports one. A candidate skill table alone cannot prove region availability. No alternative source is currently required for fixed skill costs; Stat RNG and patch metadata remain open.

Tests cover synthetic source parsing and schema drift, exact nonuniform cumulative differences, unknown jobs, malicious expressions, duplicate keys, icon overrides, selectors, Origin baseline, checkpoint identities/materials/FD, Stat normalisation and evidence redaction. Existing data, Worker routes and owner diagnostic tests must also pass. No deployment is needed for these offline tools.

## Continuation, context comparison and reconstruction integrity

The ranking and two controlled order calls above were already complete when this continuation began. They were not repeated. No new order request was justified while the source of the 104-position drift remains unsettled.

`scouter-comparison.js` compares isolated candidates by Scouter core ID and target, without importing `data.js`, reviewed aliases or saved tracker data. It reports exact sequence differences, baseline/material/FD differences for matching full sequences, and each context field as same, different or unknown. Missing values on both sides are unknown. Matching training-dummy labels or generic `patch` strings do not prove equal character calculations or patch versions. Ren substitution still does not establish a genuine Ren benchmark.

```sh
node scripts/compare-scouter-candidates.mjs before.json after.json
```

Inputs use the reconstruction shape: `job`, `selection`, `source`, `steps`, and optional `provenance.response.capturedAt`. Optional `requestContext` fields are `patchVersion`, `benchmarkFingerprint` and `resetFingerprint`. Fingerprints must be SHA-256 strings generated in a trusted server workflow, never raw private character stats. This comparison does not generate or verify the fingerprints, acquire private templates or perform a calculation. It cannot establish missing provenance from old fixtures. Capture dates are compared and reported separately from benchmark compatibility.

Checkpoint FD is compared only for an exact full-order match, with matching baselines and complete context for `fdComparable`. Different FD values remain visible as differences. Stats have no fixed checkpoint FD and are excluded from that comparison. Their source material observations remain estimates. Reviewed name and visibility overlays do not participate in source matching or leave through this report. Every report remains `publishable:false`.

Reconstruction now flags transition labels that disagree with the Origin/previous checkpoint baseline or target, conflicting returned class fields, repeated Stat baselines and FD multiplication overflow. It rejects duplicate catalogue core IDs and a selection that differs from the catalogue. Both returned class fields are checked if present, rather than letting one mask the other. This does not clear the runtime request diagnostic or prove full outgoing-body semantics.

## Prepared request fingerprints, 30 September continuation

`scouter-request-context.js` is a server-only helper used by the existing owner-only request diagnostic. It hashes the actual prepared body returned by `prepareScouterRequest`, after reset and material selection. It makes no calculation request or storage write. It does not export templates, account identifiers, character statistics, efficiencies or API keys. The build copies the module as a server dependency and does not expose it as a browser asset.

The report's `requestContext` contains schema-1 SHA-256 fingerprints using sorted JSON keys and scope separation:

- `benchmarkFingerprint` hashes the complete prepared body except both HEXA copies and `sole`. All other fields, including benchmark options, efficiencies, character statistics, region and identifiers, remain inside the hash. This is conservative: changes to an identifier may mark equivalent calculations as different, but are not silently ignored.
- `resetFingerprint` hashes the present top-level/nested core inventory, values and scalar Stat reset fields in both copies. It excludes names and material-price fields. Only Origin 1, other present cores 0, scalar 0/opened false are accepted. It does not prove inventory completeness, unknown-field semantics or all-three-Stat backend behaviour.
- `preparedBodyFingerprint` hashes the full exact JSON body, including prices and every unknown field. Key order is canonical; numeric/string types remain distinct.

Class fields must agree and selectors must be booleans. Non-finite/non-JSON input and dirty present reset values are rejected. No fingerprint clears the existing diagnostic gate. `provenance:configured-server-template` states how the body was obtained; it does not certify that the private template is a genuine job-specific benchmark. `semanticValidation:not-established-by-fingerprints` makes this limit explicit. No patch version or response capture timestamp is invented.

The helper is the provenance portion of the server acquisition work, not a complete acquisition endpoint. The normal order route and saved D1 schema are unchanged. Next, attach trusted context to the same validated response during owner-only bounded acquisition, retain explicit capture time, and feed it to isolated reconstruction/comparison. Do not attach diagnostic hashes from a separate request to an old capture, backfill missing historical context or promote a candidate based on hashes alone. GMS semantics and a genuine Ren benchmark remain unverified. This continuation does not make additional live calls or deploy the changed diagnostic.

Validation in the preceding context-comparison continuation:

- Fresh public frontend acquisition again returned 14 Hoyoung skills and four placeholders. Metadata, cost and icon-override SHA-256 values match those above. No calculation endpoint was called.
- All 420 source level costs match the reviewed tracker by source icon identity, including the explicit Hecate override. All 203 fixed transitions in the retained 206-row KMS evidence match freshly discovered schedules and source names, with zero mismatches. This is a dated evidence check, not a new order or FD measurement.
- Comparing that retained evidence with itself gives exact 206-checkpoint identity but unknown patch version, benchmark fingerprint, reset fingerprint and capture timestamp; its 203 fixed FD observations are absent. The report correctly remains non-comparable for FD and non-publishable. No private request provenance was reconstructed from labels or filenames.
- `npm test`, Worker build and syntax checks pass. Added synthetic tests cover conflicting class fields, baseline drift, duplicate inventory, selection drift, overflowing FD, repeated Stat transitions, missing provenance, world/benchmark differences, ignored display overrides, changed full-order FD and rejection of raw private strings as fingerprints.

That context-comparison continuation changed no runtime route, request preparation, D1 access, browser progress, secret or deployment. The test Site stays at version 64. Next work is the owner-only server acquisition and provenance workflow already listed above, then comparison of actual saved/fresh request contexts before reviewed promotion. The isolated comparison is ready for that workflow; it is not yet an admin UI or a complete any-job acquisition system.

## Shared server catalogue provider, 30 September 07:20 UTC

`scouter-catalogue-acquisition.js` now owns public-source retrieval for both the CLI and the Worker. The CLI delegates to this provider rather than keeping a second implementation. The provider has no dependency on tracker data, reviewed names, saved orders or Sheets. It parses the same literal metadata, cumulative cost arrays and icon overrides as before. It does not retrieve a character profile or calculate an order.

The new owner-only `GET /api/scouter-catalogue?job=호영&region=KMS&world=Heroic` accepts exactly one source job name, one GMS/KMS region and one Heroic/Interactive world. This endpoint uses the existing owner identity check, not the temporary diagnostic service-token path. Anonymous/non-owner requests return 403 before fetching; wrong methods return 405, invalid or duplicate/unknown selectors 400, and source/network/schema failures 502. Responses use `no-store`. Secrets and D1 are never read. The module and its discovery dependency are server files, not public browser assets.

Acquisition is bounded to one 25-second deadline covering headers, streamed bodies and the complete scan, 3 MB per resource, 12 MB total, and at most one page plus 45 current HTML-referenced chunks. It stops without retry on rejection, timeout, oversized/malformed data, missing modules or changed schema. Requests use only the fixed public Scouter origin and chunk path; redirects and credentials are disabled. Stream byte limits apply even when Content-Length is absent. Timeout cancels a stalled body; a stalled header also returns within the deadline even if an injected transport ignores abort.

Fresh source acquisition at **2026-09-30T07:20:22Z** returned 14 Hoyoung skills, four placeholders and 420 fixed level costs. Comparing by source icon identity against reviewed tracker schedules found **zero mismatches across all 420 costs**. Metadata, cost and icon-override hashes still match the earlier evidence. The page hash was `4c5c8b6123186ec95ccb089abff1a49075d68c459dc6d49d4bd051360b4e256e`. This was public GET verification only; no calculation request or live priority save occurred. The first local attempt was blocked by the workspace network sandbox before retrieval; the authorised public-source verification then succeeded. No source rejection or calculation retry occurred.

Tests cover alternate synthetic jobs, exact nonuniform per-level costs, source provenance, material selectors, changed names, schema drift, missing jobs/modules, rate-limit stop, header/body stalls, byte/chunk budgets, credentials/redirect restrictions, owner gate, no secret/D1 access and private-error redaction. `npm test`, Worker build and bundled syntax check pass. Requests to all three server-helper URLs return 404 in the built Worker.

This is **committed server acquisition groundwork, not yet deployed or exposed in the admin UI**. Candidate output still has empty reviewed overrides/orders/FD and `publishable:false`. A source job catalogue does not establish regional availability, genuine benchmark validity or correct order/FD. Existing configured-template fingerprinting and Stat semantic gates remain unchanged. The normal order endpoint and shared priority schema are unchanged.

Next: connect this provider and the prepared-request context to owner-reviewed, bounded order acquisition only after full request validation, record hashes for the same sent body and response capture, and reconstruct/compare the candidate. Then add the admin setup/review flow with independent reviewed names and visibility. Preserve all seven saved priority records. Do not backfill old provenance or treat this endpoint as supporting new jobs on the tracker. GMS reset semantics, genuine Ren benchmark construction and the 104-position order drift remain open. Deploy with the complete reviewable acquisition flow; test Site version 64 remains the last recorded deployment.

## Bounded order capture building block, 30 September continuation

`scouter-order-acquisition.js` connects an already prepared private request to one
bounded calculation attempt and isolated reconstruction. It is a server-only
building block, copied as a server dependency by the Worker build. **No runtime
route or admin action calls it yet. No existing live template is cleared by it.**

The caller must supply a trusted server `validatePrepared` policy. That policy
must validate complete inventory, unknown fields, reset semantics for the chosen
region, genuine job-specific benchmark/efficiency provenance and request options.
It receives frozen snapshots of the exact body and catalogue and must return
`true`; missing, false, throwing or stalled policies stop before transport.
A browser assertion is not a policy. The synthetic test policy establishes no
live job support. The existing diagnostic remains fail-closed. Fingerprints still
say `not-established-by-fingerprints`, even after this external policy passes.

The helper takes a synchronous snapshot before awaiting hashes or policy work.
The body fingerprint and benchmark/reset context describe the same snapshot
serialised into the POST. Catalogue job/region/world must match before sending.
It uses a fixed API origin/path and encoded job, server API key, no credentials
or redirects, one 25-second total deadline including validation, headers, body,
hashing and reconstruction, and a 3 MB streamed response limit. It never retries,
including 429/430. Injected transport that ignores abort still meets the deadline;
a stalled body is cancelled. Exceptions are reduced to fixed safe messages,
never raw transport, policy or JSON errors.

Only a reconstruction with zero issues is returned. The output includes exact
checkpoints, source material/FD observations, empty reviewed overrides,
`publishable:false`, catalogue provenance and the actual response bytes' SHA-256
and body-completion timestamp. Extra response fields such as character profiles
are discarded. Private body, key and validator output are not returned. No patch
version, historical provenance or genuine benchmark validity is invented.
The helper does not acquire templates, fetch a catalogue, access D1, compare or
promote saved orders, or change browser progress. The catalogue provider and
comparison modules supply those independent parts for a future owner workflow.

Validation uses synthetic requests/responses for both regions and material modes,
exact transmitted-body fingerprint equality, immutable input snapshots, response
byte hashing, redaction, policy rejection/stalls, selector/class drift, dirty
reset, rejected status without retry, wrong response identity/costs, malformed
JSON, stalled headers/bodies, misleading/missing length headers and byte limits.
A separate built-Worker check returns 404 for the module URL. The normal
`npm test` suite does not rely on a pre-existing build.

No new live calculation/profile/public-source call was made for this increment.
The previous two-call stop remains in force. GMS reset semantics, genuine Ren
benchmark construction and the 104-position drift remain open. Next implement
the concrete server policy with scoped evidence, then connect an owner-only
review action. Do not expose this helper behind a client validation flag or
replace the normal order route's existing policy without that work. Deployment
waits for the complete reviewable owner flow, as recorded in issue #23.
