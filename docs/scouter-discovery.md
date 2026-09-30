# Scouter-led reconstruction, 30 September 2026

Issue #23 is the continuation authority. This investigation extends draft PR #22; test Site version 64 is unchanged. No D1 write, display-name edit, visibility change or browser-progress change was made.

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
