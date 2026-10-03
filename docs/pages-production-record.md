# Pages production record, 4 October 2026, Brisbane

## Current deployment

| Item | Verified value |
| --- | --- |
| Public URL | https://hexa-matrix-tracker.pages.dev |
| Production branch | pages-production |
| Deployed app commit | 6ab7c1cc189a34c563d956f52870b8640f44fd4e |
| Documentation baseline at review | bc3bca2c40e149209d3feae4c7f3a388edcff1e6, app code unchanged |
| Cloudflare deployment | 5f2637eb-952b-4ede-9332-0cce5d88143a, successful GitHub Pages check |
| Exact-source push CI | 37129772888, success |
| Exact-source PR CI | 37129775164, success |
| Production push CI | 37130001670, success |
| Documentation baseline push/PR CI | 37130906148 / 37130908427, success |
| Main | 590915dbf63e8f294f7048030fb1ec095002e397, older implementation |
| PR22 | Draft, open, unmerged |

GitHub branches, checks and workflow results were re-read for this record.
The Cloudflare dashboard/configuration evidence remains owner-supplied:
production uses the DB binding for hexa-matrix-tracker,
f8d09542-7c49-44f8-bed2-9d98929753c3; production automatic Git deployment is enabled;
automatic preview deployment is disabled. No independent preview binding inspection
or Cloudflare account/API access is claimed.

## Owner acceptance

- Existing app/audit work and Infographic Helper are accepted.
- Pages owner Discord sign-in and visible Admin data were accepted after cf6d821.
- Oldest-first public Update dropdown is accepted on 6ab7c1c.
- Real alt-account Discord refusal on Pages is accepted, reported 4 October.
- Owner Sign out then reopen Admin returns Sign in on Pages, accepted 4 October.
- On 4 October Soushi reports the final Admin data check is fine after testing
  since the move to pages.dev. Mark functional Admin-data acceptance complete.
  Do not repeat this check without a change affecting the data.

The earlier preparation transfer compared all 12 priority rows and 2 skill-review
rows, including raw JSON/Helper text and timestamps. The latest acceptance is
owner testing, not a new byte-for-byte final export, atomic write-stop record or
independent audit of intervening edits. Preserve that distinction. Do not reimport
the old preparation snapshot over the current Pages database.

## Live HTTP checks

Anonymous requests against the production URL confirm:
- Public tracker returns 200 with tracker HTML.
- Admin page returns 200 with Sign in, without authenticated Admin access.
- Session endpoint reports authenticated:false/admin:false when unsigned-in and
  with an invalid __Host-hexa-admin cookie.
- Login returns 302; state cookie has Secure, HttpOnly, SameSite=Lax, Path=/,
  no Domain and Max-Age=600.
- Invalid callback returns 400 and clears state with Max-Age=0.
- Same-origin POST logout in the agent's anonymous context returns 303 and clears
  state/session cookies, retaining the security flags. Wrong-origin POST returns 403.
- Private /discord-auth.js and /docs/pages-release.md return 404.
- Public /api/tracker-catalogue returns 200.

These checks use an isolated HTTP client. They do not log out Soushi, prove actual
browser cookie storage, observe a signed-in session being revoked or perform real
non-owner OAuth. Cookie values/OAuth state are never included in this record.
The first Python HTTP attempt was blocked; the curl retry supplied these results.

## Data-preserving Pages rollback

The reviewed compatible previous app commit is
cf6d8211949f49138c8577ceae53b72b5613427d. GitHub comparison shows exactly one commit
between it and 6ab7c1c: preview-priorities.js, package.json and the sorting regression.
Authentication, Pages routing, schema and Admin writers are unchanged.
A code rollback to cf6d821 restores the unordered dropdown but retains Discord
authentication and the explanation-aware/revision-aware backend.

Keep the same Pages project, runtime configuration, secrets and current DB binding.
Do not switch to the old Sites database or restore a preparation snapshot.
This preserves Admin edits made since the move. The old host is not the default
rollback destination.

For the Git deployment route, never force pages-production backwards. Create a
reviewable revert commit on the current production ancestry, run the full checks
and exact-source CI, then fast-forward pages-production to the checked commit.
Verify the new Cloudflare deployment and affected public/Admin behaviour.
Recheck the actual current production head and target compatibility when rollback
is needed. A future schema or data-format change needs its own compatibility plan.
No rollback was executed or live data written during this documentation batch.

## Remaining release verification

- Signed-in browser session cookie attributes/storage and 8-hour expiry remain
  unverified live. Expected cookie is __Host-hexa-admin, Secure, HttpOnly,
  SameSite=Lax, Path=/ and no Domain, Max-Age=28800 at issuance.
- Owner-browser logout/revisit and real non-owner OAuth refusal on Pages are
  owner-reported accepted. Do not repeat without an affecting change.
  Anonymous HTTP evidence above retains its narrower scope.
- Complete the final release acceptance record and PR22 merge readiness after
  remaining auth checks. Do not merge merely because production is deployed.
- Old Sites header trust-boundary evidence stays separately blocked/historical;
  Pages enforces verified Discord identity, not that header.

Optional player sync, more classes, multiple characters and infographic export/
print remain deferred. No browser-save migration is required.

## Owner browser session check

The exposed browser APIs cannot read cookie metadata. Use Chrome on the owner's
PC for this remaining check; no credentials or cookie values need to be shared.

1. Sign in to Admin on https://hexa-matrix-tracker.pages.dev with the owner account.
2. Press F12, open Application, expand Storage > Cookies and select the Pages origin.
3. Find __Host-hexa-admin. Confirm HttpOnly and Secure are checked, SameSite is
   Lax, Path is /, Domain is hexa-matrix-tracker.pages.dev, and Expires is about
   eight hours after the fresh sign-in. The browser's Domain column shows the
   cookie's host; the __Host- prefix requires host-only storage in Chrome.
4. Report only whether those fields match, or name a field that differs.
   Do not send the Value column or an unredacted cookie screenshot.

This verifies stored attributes and scheduled expiry. It does not claim an
observed eight-hour wait or broaden prior device/security evidence. No fresh
login-flow acceptance is requested, only this missing metadata. Leave PR22 draft
until this evidence is recorded and final release readiness is reviewed.
