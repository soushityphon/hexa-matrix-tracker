# Cloudflare Pages preparation, Issue #32

## Scouter runtime configuration restored, 4 October 2026 Brisbane

Ren and Hoyoung fresh acquisition failed after cutover because five runtime
secrets had not moved to Pages. The owner completed a direct server-to-server
transfer of the existing values. Production redeploy3ff955e passed full
CI37142215408 and Cloudflare deploymentc6ffa328-0a27-4503-8d66-3077c893d6e9;
its app tree is unchanged from6ab7c1c. The owner reports retrieval works and the
temporary Cloudflare transfer token is revoked. The temporary old-host bridge
was removed by redeploying the original archive-backed Sites version142 with
unchanged environment14 and existing DB; no data snapshot was restored.

Pages Production needs all five original values as encrypted runtime secrets:

- `MAPLE_SCOUTER_API_KEY`
- `MAPLE_SCOUTER_REQUEST_PART_1`
- `MAPLE_SCOUTER_REQUEST_PART_2`
- `MAPLE_SCOUTER_KMS_REQUEST_PART_1`
- `MAPLE_SCOUTER_KMS_REQUEST_PART_2`

Ren uses the shared API key. Hoyoung also uses the GMS and KMS template parts.
Preserve their original genuine request values; regression fixtures are not
replacement private templates. Configuration changes require a production
redeploy. Verify fresh acquisition separately from login and existing saved
records, stopping on the first error or rate limit. Never put secret values in
chat, GitHub, public assets or logs. Cloudflare token dashboard TTL dates start
at midnight UTC; omit the start date for immediate activation.

Owner acceptance is the response to the requested Ren/Hoyoung GMS/KMS Grab
checks, not agent-observed upstream captures. See Issue33 for transfer, deployment
and cleanup evidence. The older release record below remains historical.

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

## Historical preparation status, 3 October 2026, Brisbane

Preparation only. No Cloudflare account/project, binding, current-data transfer,
runtime compilation, deployment or final URL has been verified. The test Site
stays on version142/environment14. PR22 remains draft/unmerged. Helper and real
owner/non-owner/logout/public acceptance are complete. Live browser-cookie
verification remains pending; this preparation does not waive that check.

## Build and routing

Use `npm run build:pages` with the repository's supported Node version and locked
dependencies. Set the Pages build output directory to `dist/pages`, never `dist`
or the repository root. Framework preset: None. Build root: repository root.
Configure the supported Node version explicitly when account setup is available.

`functions/[[path]].js` routes every request through the existing bundled Worker.
It enforces Discord Admin mode even if a Pages/custom-host environment accidentally
requests legacy Sites mode. Public use still requires no login. Missing Discord
configuration cannot grant Admin. Existing asset bytes, API guards, cache rules,
audio ranges, calculations, captures, saves and Admin write behaviour are reused.

The generated `dist/pages` contains only a generic `404.html` and `_routes.json`
with all routes included and none excluded. App/Admin HTML, credentials, captured
data, docs and server modules are not static fallback files. Server code stays
in `dist/server` and is imported by the Function. Cloudflare must compile that
Function; a static-only upload is not a working tracker deployment. Configure
Functions to fail closed when its request allowance is exhausted.

`npm run check:pages` builds the output and runs isolated adapter and snapshot
checks. It does not run Cloudflare's compiler/runtime or prove live D1/OAuth.
GitHub CI also runs these checks. No new dependency or deployment workflow with
stored Cloudflare credentials is introduced in this preparation.

## Account and runtime setup, still blocked

The available plugin directory returned no Cloudflare connector. No authorised
Cloudflare account/deployment route has been supplied or verified. Do not request
tokens in chat/GitHub, assume a signed-in account or publish from this draft.

After secure account access is available, confirm the actual account, project name,
Git integration or authorised CLI route and exact pages.dev origin. Compile/test
the Function with Cloudflare tooling and verify platform limits before release.
The example `wrangler.pages.example.json` is deliberately inactive. Replace all
placeholders only after identities are verified; it must not be deployed as-is.
Do not create automatic deploys from this draft branch or an older main branch.

Production needs the verified `DB` D1 binding and explicit origin/client settings.
Register `https://<actual-project>.pages.dev/auth/discord/callback` in the existing
Discord application. Keep the current test callback. Store `DISCORD_CLIENT_SECRET`,
`DISCORD_ADMIN_ID` and a fresh `ADMIN_SESSION_SECRET` as server runtime secrets.
Preserve Scouter API/request secrets and any scoped maintenance/diagnostic secrets
that are still required. Never put their values in source, logs or public assets.
An origin change requires a new login; it does not transfer a host-only cookie.

Preview must use an isolated D1 binding and separate configuration. The template
leaves preview OAuth incomplete so it cannot obtain Admin access. Do not bind
preview to live writable Admin data or share production sessions by convenience.
Confirm the exact stable preview origin before enabling any preview OAuth.

## Preserve actual current Admin data

First establish whether the existing Sites-managed D1 database can be bound to
the authorised Cloudflare account. Its existence does not prove cross-account
access. If the same database cannot be used, obtain a supported full raw export
and import into a verified target. Keep both tables and every raw column:

| Table | Columns to preserve exactly |
| --- | --- |
| `priority_preview` | `mode`, `draft_json`, `updated_at` |
| `admin_skills` | `job`, `review_json`, `updated_at` |

These raw JSON strings contain captures/schedules, availability, display names,
tags and Helper explanations. Keep malformed historical records too. Do not use
the app's ordinary restore as a lossless migration: it validates records and
creates new timestamps/revisions. Do not run reset/clear routes or overwrite an
occupied target. No database export/import or live data read is performed here.

At cutover, stop Admin writes on the old origin, wait for in-flight writes to
finish, then capture the final current data. A preparation snapshot taken while
edits continue is not a cutover snapshot. Choose the supported write-stop and
transfer route after actual account/database access is known. Do not invent an
automatic freeze in this batch or ask the owner to stop editing now.

Use authenticated **GET** `/api/admin-maintenance` exports before and after the
transfer, with verified source/target database identities recorded separately.
Keep exports private and out of GitHub/public deployment output. Run:

```sh
node scripts/compare-admin-snapshots.mjs SOURCE.json TARGET.json
```

The read-only comparator reports row counts and a SHA-256 over sorted keys plus
exact raw JSON/timestamps. Export time and row order may differ. Missing/changed
records, future Helper edits, timestamps or invalid snapshot shape must stop
cutover. It compares both tables, not only tracker-visible records. Two matching
exports alone do not prove atomic capture or the correct database bindings.

## Release and rollback checks, still pending

- Verify live browser state/session cookie attributes without copying their
  values: Secure, HttpOnly, SameSite=Lax, Path=/, no Domain, 10-minute state and
  8-hour session lifetime. The connector cannot inspect owner-browser cookie
  metadata. Existing fake-provider tests and owner reports do not complete this.
- Record the final exact release SHA and passing full/ordinary browser CI. Keep
  implementation, tests, deployment and owner acceptance separate.
- Verify target current-data comparison, public catalogue/priority reads,
  public tracker and Discord-authorised Admin under the actual Pages runtime.
  Authentication checks on the new origin are affected release checks, not a
  reason to repeat accepted tests on the unchanged old Site.
- Retain version142 with Discord env14 and current data as the old-host code
  baseline. Never restore header-trusting code or an old database snapshot.
- If target writes have begun, rollback must preserve those newer writes. Do not
  switch back to a stale source database. Establish the shared-data or reverse
  transfer/write-stop route before opening target Admin writes.
- Record actual deployment ID, literal URL, environment/bindings and compatible
  rollback in #30/#32. No final release SHA/URL/merge is claimed by preparation.

No browser/player-save migration is required. Optional player sync, infographic
export/print and multiple-character work stay deferred.

## Primary references

- [Pages routing and fail-closed configuration](https://developers.cloudflare.com/pages/functions/routing/)
- [Pages Function setup](https://developers.cloudflare.com/pages/functions/get-started/)
- [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
