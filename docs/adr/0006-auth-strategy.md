# ADR 0006: Apple and Google sign-in with opaque session tokens

Date: 2026-09-05. Status: Accepted.

## Context

Browsing needs no account. Accounts exist to post, RSVP, follow, and comment. Apple requires Sign in with Apple when any third-party sign-in is offered on iOS. There is no email and password flow. The API serves mobile (token in Keychain) and web SSR (cookie).

## Decision

Identity providers: Sign in with Apple and Google only. Clients obtain an id token natively (or via Apple JS and Google Identity Services on web) and exchange it with the API, which verifies the JWT against the provider's JWKS (cached in Solid Cache), checks issuer, audience, expiry, and nonce, then finds or creates an `identities` row and its `user`.

Sessions: the API issues an opaque random token (32 bytes, base64url). Only its SHA256 digest is stored in `sessions`. Expiry is 90 days, sliding when under 30 days remain. Mobile stores the token in `expo-secure-store`; the web SSR server stores it in an httpOnly, Secure, SameSite=Lax cookie and forwards it as a Bearer header to the API. Sign-out deletes the row. No JWT for our own sessions.

Anonymous: `X-Device-Id` (client UUID) identifies a `devices` row for push registration and personalization before sign-in; it grants no access to protected resources.

Account deletion is in-app and revokes Apple tokens through Apple's REST endpoint, per App Store rules.

Authorization uses Pundit policies. Roles: `member`, `moderator`, `admin`.

## Alternatives

| Option | Why not |
|---|---|
| Devise | Built around email, password, and browser sessions; every module we would use needs overriding. More code to delete than to write. |
| Rails 8 authentication generator | Cookie sessions and passwords; useful pattern reference for the `sessions` table, not adopted directly. |
| JWT access tokens plus refresh tokens | Stateless is not a benefit at this scale and revocation becomes a blocklist anyway. Opaque tokens are simpler and equally fast with an indexed digest. |
| Auth0, Clerk, Firebase Auth, Supabase Auth | Vendor dependency for something that is 200 lines of Ruby. Clerk has good Expo support if this ever becomes painful. |
| Magic link email | Adds email deliverability to the critical path; can be added later for users without Apple or Google. |

## Consequences

Positive: minimal code, easy revocation, no password storage, App Store compliant.

Negative: users without Apple or Google accounts cannot sign up (acceptable on iOS; revisit for web). Apple relay emails complicate account linking; linking is only automatic when the provider marks the email verified and it is not a relay address. JWKS rotation must be handled by refetching on unknown `kid`.
