# Cloudflare Pages preparation, Issue #32

## Current status, 3 October 2026, Brisbane

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
