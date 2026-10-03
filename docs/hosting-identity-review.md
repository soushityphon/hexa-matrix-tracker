# Hosting identity review, Issue #30

## Status, 3 October 2026, Brisbane

Partial verification. Anonymous spoof attempts are refused on the current public
test Site. Trusted signed-in identity injection and spoof replacement for a
signed-in non-owner still need verification. Keep Issue #30's full hosting-boundary
checkbox open. No live access vulnerability was established.

This is a test/documentation batch. It changes no Worker, browser UI, captured
data, calculations, player saves, schema, bindings, secrets or hosting policy.
PR #22 remains draft and unmerged. The owner authorises pages.dev after Helper
and Discord Admin login, under the latest #30 order. The original
anonymous checks below used version 128. Current test version 130 retains the
same identity handler and hosting configuration, with Site source
`f4f6257d7402c8c9032593431509b250f5ee4393` and deployment
`appgdep_6abff2baf52481918069d978043a85ad`. No new live identity check or deployment
is claimed for the asset-review follow-up.

The 3 October continuation re-read the current Sites Authentication guidance and
the native Site state: active, public, version 130, same owner. The guidance still
does not explicitly guarantee inbound-header replacement or direct-origin
isolation. No authorised signed-in non-owner session or verified alternate origin
is available for those tests. Keep this item blocked; do not use a service bypass
credential as evidence of a signed-in identity or probe guessed origin URLs.
The independent [asset review](asset-delivery-review.md) changes no hosting policy.

## App boundary and platform contract

`worker.js` checks the host-provided `oai-authenticated-user-email` against the
server-only `ADMIN_EMAIL`, ignoring email case. The Worker does not authenticate
that header itself. A direct handler test with a matching synthetic header is
therefore deliberately accepted. Do not expose this Worker through a different
host or direct origin without first verifying the equivalent identity boundary.

Sites authentication guidance says signed-in visitors receive
`oai-authenticated-user-id` and `oai-authenticated-user-email`; anonymous public
visitors receive neither. That guidance alone does not establish how incoming
visitor-supplied headers are stripped or replaced, or prove the behaviour of this
specific deployment. The current app's approved email allowlist is retained.
Do not replace it with a workspace account ID: Sites user IDs are site-scoped.

Existing maintenance and diagnostic bearer secrets authorise only their specific
routes. Neither is a general admin credential, and no service credential proves
a signed-in user identity.

## Live anonymous evidence

Reviewed GitHub development head `e725069265047cc72624967929ea38d351410556`
and public test version 128. Cookie-free curl GETs used the exact Site origin,
without following redirects, sign-in, bearer credentials or data writes.

| Incoming identity | `/api/admin-panel` | `/priority-review.html` |
| --- | --- | --- |
| None | 403, app denial | 200, sign-in page |
| Exact owner email | 403, app denial | 200, sign-in page |
| Mixed-case header and uppercase owner email | 403, app denial | 200, sign-in page |
| Owner email plus visitor-supplied user ID | 403, app denial | 200, sign-in page |
| Duplicate email headers, owner first | 403, app denial | 200, sign-in page |
| Duplicate email headers, owner last | 403, app denial | 200, sign-in page |

All twelve checks returned the expected app responses. API denial was exactly
`Admin access required`; page checks matched the owner sign-in copy. A separate
forged-email API response also had `Cache-Control: no-store`. These observations
show that the tested anonymous spoof headers did not grant owner access. They do
not prove the internal strip/inject implementation, signed-in spoof replacement,
alternate origins, every proxy path or future hosting configurations.

Python urllib requests returned a different 403 response and cache policy. They
are inconclusive gateway responses, excluded from the twelve app-response passes.
Do not count a generic 403, challenge, redirect or network failure as an app pass.
No private response bodies, emails, cookies or tokens are included in this report.

## Repeatable isolated coverage

`node tests/hosting-auth.test.mjs`, also included in `npm test`, checks the actual
Worker's protected APIs and sign-in pages. Missing/non-owner identity, alternate
identity headers, cookie/email text, malformed combined email values and bearer
scope violations cannot reach storage or upstream Scouter. A synthetic matching
trusted email reaches the authorised branch; absent owner configuration fails
closed. These are post-gateway tests, never a live gateway verification claim.

Existing compiled delivery checks continue to verify that private source,
manifests and development files are not public assets. This report and the new
test are not added to the Worker asset list.

## Remaining hosting proof and sequencing

The owner accepted all pending existing app/audit checks on 3 October, including
ordinary Admin access. That does not prove signed-in non-owner spoof replacement
or direct-origin isolation. Do not ask for the accepted app check again.

Exact blocker: no supported guarantee of inbound-header stripping/replacement or
origin isolation, no authorised signed-in non-owner session and no verified
alternate origin. The 3 October guidance/state review adds no such guarantee.
Do not repeat the same probes without new evidence or a new approach; never guess
origin URLs, reuse owner cookies or count service bypass credentials as user proof.

The full hosting check remains open. After independent release-record preparation,
continue Helper mapping/prototype work under #31. This introduces no authentication
or hosting change. Resolve the old-host boundary with supported evidence or a
reviewed replacement before changing access/hosting. #15 must establish verified
Discord identity and owner authorisation for pages.dev, without trusting Sites
headers there. #32 verifies Cloudflare access and current Admin-data preservation.
The final release SHA/deployment record belongs to priority 4, not before Helper.
Export/print stays deferred. Existing browser saves do not require migration.
