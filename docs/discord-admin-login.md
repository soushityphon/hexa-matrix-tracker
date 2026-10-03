# Discord Admin login, Issue #15

## Deployed Discord Admin preparation, version 139

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
