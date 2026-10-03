# Discord Admin login, Issue #15

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
