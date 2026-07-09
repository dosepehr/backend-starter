# Frontend Auth Integration Guide

This document describes how to integrate a frontend app with this server's authentication system. It covers every endpoint, the exact request/response shapes, error handling, and the token lifecycle (issue → refresh → logout).

## Base setup

- **Base URL path**: all endpoints are prefixed with `/api/v1` (global prefix `api` + URI versioning, default version `1`).
  Example: `POST {BASE_URL}/api/v1/auth/login`
- **Auth model**: mobile number + password, or mobile number + OTP. There is no email/username login and no OAuth/social login.
- **Tokens**: a short-lived JWT **access token** (15 min) and an opaque **refresh token** (7 days), both returned in the JSON response body — never in cookies. Your app is responsible for storing them (e.g. in memory + secure storage) and attaching the access token to subsequent requests.

## Response envelope

Every response — success or error — is wrapped consistently.

**Success:**
```json
{
  "status": true,
  "message": "Logged in successfully",
  "data": { "...": "endpoint-specific payload" }
}
```

**Error:**
```json
{
  "status": false,
  "message": "Invalid credentials",
  "requestId": "8841d7ad-5a06-46e3-9273-a72031663553"
}
```

**Validation error** (400, from DTO validation) additionally includes an `errors` map keyed by field name:
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "mobile": ["Invalid mobile number format"],
    "password": ["password must be longer than or equal to 8 characters"]
  },
  "requestId": "..."
}
```

Always read `status` to distinguish success from error — don't rely on HTTP status code alone for UI branching, though the HTTP status is also set correctly (200/201 vs 4xx/5xx).

## Mobile number format

All `mobile` fields must match `^09\d{9}$` (Iranian mobile format, e.g. `09123456789`) — 11 digits starting with `09`. The server validates this and returns a 400 with a field-level error if it doesn't match.

## Password rules

Any endpoint that sets a password (`signup/details`, `password/reset`, `me` with `newPassword`) requires:
- minimum 8 characters
- at least one uppercase letter, one lowercase letter, one digit, and one special character

Example valid password: `SecurePass123!`

---

## Registration flow (signup)

Two-step flow: submit details → verify OTP → account created + logged in.

### 1. `POST /auth/signup/details`
Public. No auth required.

**Request:**
```json
{
  "mobile": "09123456789",
  "name": "john_doe",
  "password": "SecurePass123!"
}
```
- `name`: minimum 3 chars, must be unique across all users. Enforce a 20-char max in your UI even though the API doesn't validate an upper bound here — the database column is capped at 20 and a longer value will fail server-side.
- `password`: see password rules above.

**Response (200):**
```json
{
  "status": true,
  "message": "Signup details saved, OTP sent",
  "data": {
    "message": "Registration data saved and OTP sent successfully",
    "otp": "123456"
  }
}
```

> ⚠️ **Dev-mode note**: the OTP is currently returned directly in the response body instead of being sent exclusively via SMS. Treat `data.otp` as **temporary scaffolding for local development/testing only** — do not build UI that reads the OTP from this response in a way that ships to production; the backend will remove this field once SMS delivery is wired up. In production the user must receive the OTP by SMS.

**Errors:**
- `400` — validation failure (bad mobile/name/password format)
- `409` — mobile or username already registered
- `429` — too many OTP requests for this mobile (rate-limited: 3 per 10 minutes)

Signup details + the generated OTP are cached server-side for **10 minutes**. If the user doesn't complete verification in time, they must resubmit this step.

### 2. `POST /auth/signup/verify`
Public. No auth required.

**Request:**
```json
{
  "mobile": "09123456789",
  "otp": "123456"
}
```

**Response (201) — account created, user is now logged in:**
```json
{
  "status": true,
  "message": "Account created successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "e4158483-a379-4efa-a686-804253bb3ed1",
    "sessionExpiry": 1783548580
  }
}
```

`sessionExpiry` is a **Unix timestamp in seconds** marking when `accessToken` expires — use it to schedule a silent refresh (see [Token lifecycle](#token-lifecycle) below).

**Errors:**
- `400` — validation failure
- `401` — invalid or expired OTP
- `404` — no signup details found for this mobile (details step expired or was never submitted)
- `409` — mobile or username already registered (can happen if two signups race — see note below)

There is no separate "verify email" step and no separate login call needed after signup — the user is authenticated immediately.

---

## Login flow

Two independent ways to log in: password, or OTP. Use whichever fits your UX (e.g. password for returning users, OTP as password-less alternative).

### Check whether a mobile is registered (optional first step)
### `POST /auth/check-mobile`
Public. Useful for a single "continue" input where you don't yet know if the user should see a login or signup form.

**Request:**
```json
{ "mobile": "09123456789" }
```

**Response — mobile is registered (OTP for login was also just sent):**
```json
{
  "status": true,
  "message": "Mobile checked successfully",
  "data": {
    "action": "login",
    "message": "User exists. OTP sent for login.",
    "otp": "123456"
  }
}
```

**Response — mobile is not registered:**
```json
{
  "status": true,
  "message": "Mobile checked successfully",
  "data": {
    "action": "signup",
    "message": "User not found. Please signup."
  }
}
```

Branch your UI on `data.action` (`"login"` vs `"signup"`). Note: calling this endpoint for an existing mobile **immediately sends a login OTP** as a side effect (see the OTP note above re: `otp` field in dev mode) — don't call it speculatively/repeatedly, it's rate-limited (429 after 3 calls per 10 min per mobile).

### Option A — Password login
### `POST /auth/login`
Public.

**Request:**
```json
{
  "mobile": "09123456789",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "status": true,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "sessionExpiry": 1783548580
  }
}
```

**Errors:**
- `400` — validation failure
- `401` — invalid credentials
- `429` — account temporarily locked after **5 failed attempts** within 15 minutes. Show the user a clear "try again later" message rather than a generic error — retrying immediately will keep failing until the lockout window passes.

### Option B — OTP login
Two calls: request an OTP, then verify it.

#### `POST /auth/otp/resend` (with `type: "login"`)
Public. Use this (or `check-mobile`, which also sends one) to (re)send a login OTP.

**Request:**
```json
{ "mobile": "09123456789", "type": "login" }
```

**Response (200):**
```json
{
  "status": true,
  "message": "OTP resent successfully",
  "data": { "message": "OTP resent successfully", "otp": "123456" }
}
```

**Errors:** `400` (bad type/mobile), `404` (mobile not registered), `429` (rate-limited)

#### `POST /auth/login/otp/verify`
Public.

**Request:**
```json
{ "mobile": "09123456789", "otp": "123456" }
```

**Response (200):** same `TokenResponseDto` shape as password login.

**Errors:** `400`, `401` (invalid/expired OTP), `404` (user not found)

> OTPs are 6 digits and expire after **2 minutes**. Rate limit is 3 OTP requests per mobile per 10-minute window across all OTP-issuing endpoints (`check-mobile`, `otp/resend`, `signup/details`, `password/forgot`).

---

## Token lifecycle

### Storing tokens
- `accessToken`: a JWT, 15-minute lifetime. Send it as `Authorization: Bearer <accessToken>` on every request to a protected endpoint.
- `refreshToken`: an opaque token, 7-day lifetime, single-use (rotates on every refresh — see below). Store it more carefully than the access token since it's longer-lived.
- `sessionExpiry`: Unix seconds timestamp for the access token's expiry. Use this to proactively refresh **before** the token expires rather than waiting for a 401.

### Refreshing (silent renew)
### `POST /auth/refresh`
Public (doesn't require the access token — only the refresh token in the body).

**Request:**
```json
{ "refreshToken": "e4158483-a379-4efa-a686-804253bb3ed1" }
```

**Response (200) — a brand-new pair:**
```json
{
  "status": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "accessToken": "eyJ... (new)",
    "refreshToken": "d1f107c4-... (new, different from the one you sent)",
    "sessionExpiry": 1783548770
  }
}
```

**Critical: refresh tokens are single-use and rotate on every call.** After calling `/auth/refresh`, discard the old refresh token and store the new one — it will not work again. Recommended pattern:

```
scheduleRefresh(sessionExpiry):
  delay = (sessionExpiry * 1000 - Date.now()) - BUFFER_MS   // e.g. refresh 60s early
  setTimeout(() => refresh(), max(delay, 0))

refresh():
  response = POST /auth/refresh { refreshToken: stored.refreshToken }
  on success: store new { accessToken, refreshToken, sessionExpiry }, scheduleRefresh(sessionExpiry)
  on 401: refresh token is dead — clear stored tokens and redirect to login
```

**Errors:**
- `400` — validation failure (missing/malformed refresh token)
- `401` — invalid or expired refresh token. **Do not retry** — clear local session state and force re-login. (Reusing an already-rotated-away refresh token also lands here, and server-side revokes every other active session for that user as a security measure — so if this happens unexpectedly to a legitimate user, all of their other devices will also be logged out. This is intentional stolen-token protection, not a bug to route around.)

### Logging out
### `POST /auth/logout`
**Requires** `Authorization: Bearer <accessToken>` header.

**Request:**
```json
{ "refreshToken": "e4158483-a379-4efa-a686-804253bb3ed1" }
```

**Response (200):**
```json
{ "status": true, "message": "Logged out successfully", "data": { "message": "Logged out successfully" } }
```

This immediately invalidates both tokens server-side — the access token is blacklisted (rejected even though it hasn't naturally expired yet) and the refresh token is deleted. Clear both from local storage after this call succeeds (and clear them locally even if the call fails due to network issues — don't block logout UX on it).

### Handling a 401 on any protected request
If any authenticated call returns 401 with `"Token has been revoked"` or `"Invalid or expired token"`:
1. Try `/auth/refresh` once with the stored refresh token.
2. If refresh succeeds, retry the original request with the new access token.
3. If refresh also fails (401), clear all local session state and redirect to login.

This can happen not just on natural expiry but also if: the user's role changed (admin action revokes all outstanding access tokens instantly), the session was revoked remotely (see [Session management](#session-management)), or the user logged out from another tab/device that shared the same refresh token family.

---

## Session management

Users can view and revoke their own active sessions (e.g. "log out other devices" UI).

### `GET /auth/sessions`
Requires `Authorization: Bearer <accessToken>`.

**Response (200):**
```json
{
  "status": true,
  "message": "Active sessions retrieved",
  "data": {
    "count": 2,
    "sessions": [
      {
        "token": "e4158483-a379-4efa-a686-804253bb3ed1",
        "ip": "203.0.113.4",
        "userAgent": "Mozilla/5.0 ...",
        "createdAt": "2026-07-08T21:54:40.646Z",
        "lastUsedAt": "2026-07-08T21:54:40.646Z"
      }
    ]
  }
}
```

A user can have at most **5 concurrent sessions**; the oldest is silently evicted when a 6th login/refresh happens.

Note: `token` here is the *refresh token* value for that session — treat it as a session identifier for the revoke call below, not something to display raw to the user. There's no device name field yet, so build your "other sessions" UI around `userAgent` + `lastUsedAt` for now.

### `DELETE /auth/sessions/:token`
Requires `Authorization: Bearer <accessToken>`. Revokes one specific session by its refresh-token value (from the list above). Use this to let a user kill a session that isn't their current one.

**Response (200):**
```json
{ "status": true, "message": "Session revoked successfully", "data": { "message": "Session revoked" } }
```

**Errors:** `404` — session not found (already expired/revoked, or doesn't belong to this user).

---

## Profile

### `GET /auth/me`
Requires `Authorization: Bearer <accessToken>`.

**Response (200):**
```json
{
  "status": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 21,
    "createdAt": "2026-07-08T21:54:40.640Z",
    "updatedAt": "2026-07-08T21:54:40.640Z",
    "name": "tvtest4",
    "mobile": "09120000004",
    "email": null,
    "role": "USER"
  }
}
```
`role` is `"USER"` or `"ADMIN"`. `email` is `null` until the user sets one via the update endpoint below (there is no email verification step).

### `PATCH /auth/me`
Requires `Authorization: Bearer <accessToken>`. All fields optional — send only what changed.

**Request (any subset):**
```json
{
  "name": "new_username",
  "email": "user@example.com",
  "oldPassword": "SecurePass123!",
  "newPassword": "EvenMoreSecure456!",
  "rePassword": "EvenMoreSecure456!"
}
```
- To change the password, `oldPassword` + `newPassword` are both required together; `rePassword` must match `newPassword` exactly if `newPassword` is present.
- `name`: 4–20 chars, must be unique.
- `email`: standard email format, must be unique, max 100 chars.

**Response (200):** updated `User` object, same shape as `GET /auth/me`.

**Errors:**
- `400` — validation failure, or password change requested with only one of `oldPassword`/`newPassword`
- `401` — `oldPassword` doesn't match current password
- `409` — `name` or `email` already taken by another user

---

## Forgot / reset password

### `POST /auth/password/forgot`
Public.

**Request:**
```json
{ "mobile": "09123456789" }
```

**Response (200):**
```json
{
  "status": true,
  "message": "Password reset OTP sent successfully",
  "data": { "message": "OTP sent successfully", "otp": "123456" }
}
```

**Errors:** `404` (mobile not registered), `429` (rate-limited)

### `POST /auth/password/reset`
Public.

**Request:**
```json
{
  "mobile": "09123456789",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200) — password changed AND user is logged in with a fresh token pair:**
```json
{
  "status": true,
  "message": "Password reset successfully",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "sessionExpiry": 1783548580
  }
}
```
No separate login call needed after a successful reset — store the returned tokens directly.

**Errors:** `401` (invalid/expired OTP), `404` (mobile not registered)

---

## Endpoint reference (quick table)

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| POST | `/auth/check-mobile` | No | Check if mobile is registered; sends login OTP if so |
| POST | `/auth/otp/resend` | No | Resend OTP for `login` or `signup` |
| POST | `/auth/login` | No | Password login |
| POST | `/auth/login/otp/verify` | No | OTP login |
| POST | `/auth/signup/details` | No | Signup step 1 |
| POST | `/auth/signup/verify` | No | Signup step 2 (creates account, logs in) |
| POST | `/auth/refresh` | No (refresh token in body) | Rotate token pair |
| POST | `/auth/logout` | Yes | Invalidate current access + refresh token |
| GET | `/auth/sessions` | Yes | List active sessions |
| DELETE | `/auth/sessions/:token` | Yes | Revoke one session |
| GET | `/auth/me` | Yes | Get own profile |
| PATCH | `/auth/me` | Yes | Update own profile / password |
| POST | `/auth/password/forgot` | No | Send password reset OTP |
| POST | `/auth/password/reset` | No | Reset password, logs in |

## Things this API does **not** support (design accordingly)

- No email/username login, no social/OAuth login.
- No 2FA/MFA as an *additional* factor (OTP replaces password, it's not layered on top of it).
- No email verification flow.
- No "remember this device" / trusted-device concept.
- Session list has no device name — only IP + user-agent + timestamps.

## Rate limiting summary

| What | Limit |
|---|---|
| Any request (global) | 10 req/sec, 100 req/min per client |
| OTP issuance (any type, per mobile) | 3 per 10 minutes |
| Password login failures (per mobile) | 5 failures → locked for 15 minutes |

Design your UI to surface `429` responses with a clear "please wait" message rather than silently retrying — retrying immediately will not help and just re-triggers the same limit.
