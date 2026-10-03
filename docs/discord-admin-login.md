# Discord Admin login, Issue #15

## Cloudflare redirect compatibility correction

Owner reports140 sign-in still fails. Native fixed logs show
`Admin sign-in failed token request 0`, before any provider HTTP response.
Cloudflare's workerd source explicitly rejects RequestInit redirect:error, despite
the request documentation listing it. Node/fake-fetch tests previously accepted
that setting and did not reveal the deployed-runtime mismatch.
Use redirect:manual on both Discord calls, and refuse every3xx response before
reading a body or granting a session. Redirects are never followed, so credentials
stay on the fixed Discord destinations. Tests cover301/302/303/307/308 at token
and identity stages, no follow-up request, no session and fixed safe diagnostics.
No secret/runtime/access/data changes; neutral login copy and all auth safeguards
remain. Actual owner sign-in, non-owner/cookies/logout and acceptance are pending
until a real retry, not inferred from this correction.

Primary source: https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B


## Current sign-in failure follow-up, version140

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


## Sign-in failure follow-up

Owner reports live callback failure after env14 activation. Recent native logs
show callback502 after state validation, but contain no exchange/identity reason.
Owner success/identity/non-owner/logout/acceptance remain unchecked.
New batch uses Discord's required application User-Agent on both API calls, and
logs only fixed stage/reason and numeric HTTP status on failures. No codes,
tokens, secrets, user IDs, request URLs or provider bodies are logged. A broken
logging sink cannot grant access or prevent the safe error response.
This corrects API request compliance, not a proven resolution of the reported
live failure. A fresh real sign-in is needed to verify or diagnose the remaining
exchange/identity failure. No credentials need re-entry unless later evidence
shows a configuration error.

Owner requests neutral login copy: only Admin Panel and Sign in, without the
Discord explanation or Back to tracker link. Authentication remains Discord;
Discord's own consent screen is outside the tracker. Tests assert the login copy,
User-Agent on both requests and private-safe fixed diagnostics for HTTP/body/
timeout/request failures and logging-sink failure. Data/storage/auth policy stays
unchanged. Prior automated evidence is retained; new live proof is not inferred.

Primary requirement: https://docs.discord.com/developers/reference#user-agent


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

Next owner check: open `/priority-review.html`, choose Sign in,
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



## Current batch and activation boundary

Helper through version138 is owner-reported accepted, including its quadrant
colours. Discord Admin identity is the next priority under #30. Soushi chooses a
dedicated tracker developer application. Optional player sync is separate and
not implemented; local tracker/calculator use requires no login.

This batch implements a server-only, configuration-gated OAuth flow and owner
allowlist. The current test runtime has no Discord configuration and remains in
legacy Sites mode, with the same Admin access and data. Discord activation,
verified owner identity, live sign-in/non-owner refusal/logout and acceptance
remain blocked until the setup below exists. Do not check these off from fixtures.

## Protocol and session policy

- `GET /auth/discord/login` requests only `identify` through Discord's code grant.
- A signed, browser-bound state cookie expires after10minutes. Callback must match
  the nonce, configured HTTPS origin and exact registered callback. Duplicate
  parameters, missing/tampered/expired state and external return URLs are refused.
- `GET /auth/discord/callback` exchanges the code server-side, then calls
  `/api/v10/users/@me`. Only the exact configured Discord user ID gets Admin.
  A username, email, guild role, Sites header or ordinary Discord login cannot
  grant Admin in Discord mode. Non-owner login clears any existing Admin cookie.
- Session cookies use HMAC-SHA256 through Workers Web Crypto, `__Host-` names,
  Secure, HttpOnly, SameSite=Lax, Path=/, no Domain, and an8hour expiry. They bind
  owner ID, application and origin. Each protected request rechecks the allowlist.
  No Discord access/refresh token, profile, email or player save is persisted.
- Admin writes require the exact configured Origin and JSON content type.
  `POST /auth/discord/logout` requires that Origin and clears browser cookies.
  The protected Admin header adds a Sign out button only in Discord mode.
- Logout clears this browser's session. A copied signed session remains valid
  until expiry; rotating `ADMIN_SESSION_SECRET` invalidates all sessions. Changing
  the owner/application/origin also invalidates existing sessions. No session DB
  or migration is introduced.
- Discord response headers and bodies share an8second deadline. Redirects,
  oversized responses, invalid identities, cancellation and provider failure
  cannot grant access. Error pages do not reveal provider details or secrets.
- Sign-in/session responses are not cached and suppress referrers. OAuth tokens
  stay server-side. `discord-auth.js` is a server module, not a public asset.
- Existing explicitly scoped maintenance/diagnostic service tokens retain their
  narrow access; they never become generic Admin credentials.

Legacy Sites mode is retained for the existing Site only. The Pages/Workers
development hostnames refuse Sites-header authorisation even if that mode was
left unset. Unknown modes fail closed. Other historical gateway guarantees stay
blocked; this code does not prove stripping/replacement on the old host. A future
Pages/custom-host deployment must explicitly configure Discord mode and exact
origin, not inherit the legacy defaults.

## Runtime configuration, not committed files

| Key | Value | Storage |
| --- | --- | --- |
| `ADMIN_AUTH_MODE` | `discord`, only when setup is verified | Runtime variable |
| `ADMIN_AUTH_ORIGIN` | Exact HTTPS origin, no trailing slash/path/query | Runtime variable |
| `DISCORD_CLIENT_ID` | Dedicated application's numeric Client ID | Runtime variable |
| `DISCORD_ADMIN_ID` | Soushi's numeric Discord User ID | Server configuration |
| `DISCORD_CLIENT_SECRET` | OAuth client secret, not a bot token | Runtime secret |
| `ADMIN_SESSION_SECRET` | Fresh random32byte key encoded as base64url, at least43characters | Runtime secret |

Incomplete Discord configuration fails closed. Keep all existing D1/bindings,
Admin source credentials and data. Set secrets through the hosting secret UI or
authorised native environment tools, never source files, public GitHub or chat.

## Owner setup still required

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
   and create a dedicated application, for example HEXA Matrix Tracker.
2. In OAuth2, register this exact test callback:
   `https://soushi-hexa-matrix-test.xsoushi.chatgpt.site/auth/discord/callback`.
   No bot installation, email or guild permission is needed for this flow.
3. Provide the public Client ID and your numeric User ID. Discord Developer Mode
   lets you copy your User ID from your profile. Do not use a display name.
4. Put the Client Secret in the server's `DISCORD_CLIENT_SECRET` secret setting.
   Do not paste it in chat. The session key can be generated securely when the
   authorised runtime setup is performed. The agent has not set any new values.
5. Once these exist, configure the exact origin and owner allowlist and activate
   Discord mode in a reviewed deployment. Keep the existing Site/data available.
   Confirm real owner login reads the current Skills/explanations/priorities,
   non-owner access is denied, logout closes access, and public tracker still works.
   Do not edit/reset data as an identity check. Read-only access is sufficient.

There is no verified owner Discord ID, application Client ID/client secret or
registered callback yet. Those are the exact live activation blockers. Missing
Cloudflare access/data-cutover proof remains separate under #32. Do not create a
Pages project or migrate data to work around incomplete login setup.

## Checks and release sequencing

Isolated tests exercise the real Worker owner/anonymous/non-owner branches,
state/session expiry/tampering/duplicates, origin/application/key/allowlist changes,
JSON/Origin CSRF guards, failure body limits/deadlines and logout. They use fake
Discord responses and no live Admin data. The compiled delivery check must deny
the server module publicly. Existing revision/backup/Helper/player tests remain.
Live browser OAuth/cookie/gateway verification is not inferred from these tests.

Before activation, rollback to the existing explanation-aware version138 is
compatible while retaining Sites mode and all current data. After activation,
rollback must keep a Discord-aware backend and Discord mode, not revert to an
older header-trusting Worker. Record the actual activation environment/version
and compatible rollback separately. PR #22 stays draft/unmerged.

After verified Admin login and acceptance, continue pages.dev release under #32,
preserving the actual current Admin data at cutover. No browser-save migration is
required. Optional player-sync storage/privacy/conflicts remain unresolved later
work; multiple characters and infographic export/print remain deferred.

Primary references: [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2)
and [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).
