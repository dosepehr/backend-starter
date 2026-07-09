# Frontend Error Handling Guide

This document describes every error shape the API can return and exactly how a frontend client should react to each. It applies to **all endpoints**, not just auth — the error envelope and status codes are produced by one global exception filter, so the rules here are consistent app-wide.

## The rule of thumb

Never brand a request "successful" or "failed" based on HTTP status code alone in your low-level fetch wrapper — check `status` in the JSON body too, but for control flow (retry, redirect to login, show a toast), branch primarily on **HTTP status code**, and use `message` / `errors` only for *display text*, never for logic. Message strings are for humans, not for `if (message === '...')` checks — they can be reworded server-side without notice.

## Error envelope (always this shape)

Every error response, regardless of cause, has this shape:

```json
{
  "status": false,
  "message": "Human-readable summary",
  "requestId": "8841d7ad-5a06-46e3-9273-a72031663553"
}
```

- `status` is always `false` for errors — this is how you distinguish an error body from a success body if you ever inspect JSON before checking the HTTP status.
- `message` is a single string, always safe to show directly in a toast/banner.
- `requestId` is present whenever request-tracing is available (essentially always). **Log this alongside any error you report to your own error tracker (Sentry, etc.) and show it in "contact support" flows** — it's the key needed to find the exact request in server logs. Don't discard it.

### Validation errors add an `errors` map

For `400` responses caused by request body/query validation, the envelope gains an `errors` field:

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

- Keys are field names from your request body (matching the DTO property name — e.g. `mobile`, `password`, `name`, `email`).
- Values are arrays of human-readable messages for that field (usually just one, but code defensively for more).
- **When `errors` is present, prefer field-level inline messages over the top-level `message` banner** — attach `errors.mobile[0]` under the mobile input, etc. Fall back to showing `message` as a generic banner only if `errors` is absent or a field you don't recognize is the only one populated.
- If a key doesn't match any field in your form (e.g. server added a new validation rule you don't have a UI slot for), fall back to showing it in a generic error summary rather than silently dropping it.

## Status code reference and required handling

| Status | When it happens | What the client must do |
|---|---|---|
| **400** Bad Request | Request body/params failed validation (see `errors` map above); or a malformed reference (e.g. FK to a non-existent resource) | Show field-level errors from `errors` if present, otherwise show `message`. **Do not retry automatically** — the request itself is invalid until the user changes input. |
| **401** Unauthorized | Missing/invalid/expired access token; wrong password/OTP; revoked token (logout, role change, or refresh-token-reuse detection) | See [Handling 401s](#handling-401s) below — this is the one status that needs branching logic, not just a toast. |
| **403** Forbidden | Authenticated, but the user's role doesn't permit this action | Show `message` as a permissions error (e.g. "You don't have access to this"). **Do not retry, do not redirect to login** — the user IS logged in, they just can't do this. Hide/disable the triggering UI if you can detect this ahead of time. |
| **404** Not Found | Requested resource doesn't exist (e.g. user not found, session not found) — also returned for some auth flows when the underlying record was never created (e.g. resend OTP for a signup that never got past step 1) | Show `message`. For list/detail views, treat as "this no longer exists" and drop it from local state / navigate back. |
| **409** Conflict | Uniqueness violation (mobile/username/email already taken) — either from an app-level pre-check or from the database rejecting a duplicate under concurrent requests | Show `message` inline near the conflicting field (e.g. "Mobile is already registered" under the mobile input). **Do not retry with the same payload** — it will conflict again. Prompt the user to change the value. |
| **408** Request Timeout | The request took longer than the server's timeout budget (default 30s) | Safe to offer a manual "Retry" button. Do not auto-retry silently more than once — repeated timeouts usually mean a real problem, not a blip. |
| **429** Too Many Requests | Rate limit hit — either the global per-client limit (10 req/sec, 100 req/min), the OTP-issuance limit (3 per mobile per 10 min), or the login-failure lockout (5 failed password attempts per mobile per 15 min) | Show `message` as-is (it already says how long to wait, e.g. "Try again in 15 minutes"). **Never auto-retry.** Disable the triggering button/form for a cooldown period if you can; at minimum, don't let the user spam the same action. |
| **500** Internal Server Error | Unhandled server-side failure the client can't do anything about (a genuine bug or unmapped DB error) | Show a generic "something went wrong" message — **never surface `message` from a 500 directly to the user** (see note below). Log `requestId` to your error tracker. Safe to offer a manual retry for idempotent GETs; be cautious retrying POSTs that might have partially succeeded. |
| **503** Service Unavailable | Health-check-style failure (a dependency like the database or Redis is down) — distinct envelope, see below | Treat as "the service is temporarily down." Safe to retry with backoff. Don't treat this as a client bug. |

### A note on 500s specifically

Every effort is made server-side to turn foreseeable failure modes (validation, duplicates, missing records, auth problems) into one of the 4xx codes above with a clean message. A `500` reaching your client means either a genuine server bug, or a database error code that isn't yet mapped to a friendly message — in both cases `message` may say only `"Internal server error"` with no further detail, **by design** (the server does not leak stack traces or driver internals to clients). Don't build UI copy that assumes `message` will ever be specific on a 500 — always show your own generic fallback string instead, and rely on `requestId` for debugging, not on parsing the message.

### The 503 envelope is different

Health/readiness failures (only relevant if you're building an internal status page against `/health`, not typical app screens) return:

```json
{
  "status": "error",
  "info": { "database": { "status": "up" } },
  "error": { "redis": { "status": "down" } },
  "requestId": "..."
}
```

Note `status` here is the **string** `"error"`, not the boolean `false` used everywhere else — this endpoint is a special case (Terminus health-check format), don't reuse your generic error-envelope parser for it.

## Handling 401s

401 is the one case that needs real branching logic instead of just a toast, because it can mean several different things:

1. **No token was sent at all**, or the access token is malformed/expired (`"No token provided"`, `"Invalid or expired token"`).
2. **The token was explicitly revoked** (`"Token has been revoked"`) — this happens on logout, on an admin-initiated role change, or when the refresh-token-reuse protection kicks in and kills every session for that user.
3. **Bad credentials on a login/verification endpoint** (`"Invalid credentials"`, `"Invalid or expired OTP"`, `"Old password is incorrect"`) — this is a normal user-input error, not a session problem.

Tell these apart by **which endpoint returned the 401**, not by parsing the message text:

```
if the 401 came from a protected endpoint (e.g. GET /auth/me, GET /auth/sessions, PATCH /auth/me, POST /auth/logout):
    // Case 1 or 2 — the session itself is the problem.
    try POST /auth/refresh once with the stored refresh token
    if refresh succeeds:
        retry the original request with the new access token
    if refresh also returns 401:
        clear all local session state (both tokens)
        redirect to login
        // do this silently — don't show an error toast for an expected
        // "your session ended" case, a redirect to login is enough

if the 401 came from a login/verify/reset endpoint itself
   (POST /auth/login, /auth/login/otp/verify, /auth/signup/verify,
    /auth/password/reset, PATCH /auth/me with a bad oldPassword):
    // Case 3 — this is just wrong input, not a session issue.
    show `message` inline on the relevant form
    do NOT clear tokens, do NOT redirect
    do NOT call /auth/refresh — there is nothing to refresh
```

The most common integration bug is treating every 401 as "log the user out." Don't do that for 401s coming back from the login form itself — that's just a wrong password, the user isn't logged in yet.

### `POST /auth/refresh` 401s are final

If `/auth/refresh` itself returns 401 (`"Invalid or expired refresh token"`), do not retry it and do not attempt any other recovery — the refresh token is dead (expired, already used, or explicitly revoked). Clear local session state and redirect to login immediately.

One important side effect: if a refresh token is reused after it was already rotated away (e.g. a stale copy sitting in two open tabs, or a genuine stolen-token scenario), the server treats this as a compromise signal and **revokes every other active session for that user**, not just the one making the bad call. If your app has multiple tabs/windows open, make sure only one of them "owns" refreshing (e.g. via a leader-election lock or a shared worker) — otherwise two tabs racing to refresh the same token will cause one of them to trigger this and log everything out. See the [frontend auth guide](./frontend-auth-guide.md#token-lifecycle) for the full refresh/rotation model.

## Network-level failures (no HTTP response at all)

Not covered by the envelope above because there is no server response to parse — these are client-side fetch/XHR failures (DNS failure, no connectivity, CORS rejection, request aborted). Handle these separately from HTTP error codes:

- Show a generic "check your connection" message — do not attempt to read `.message`/`.errors` off a network error, the shape will not match the API envelope.
- Safe to offer retry with backoff.
- Do not treat as a 401 — do not clear tokens or redirect to login on a network failure. Losing connectivity should never look like being logged out.

## Quick checklist for a new API call in the frontend

- [ ] Parse `status`/`message`/`errors`/`requestId` using one shared response-parsing utility — don't hand-roll this per call site.
- [ ] Map `errors` (if present) to form field errors before falling back to a generic `message` banner.
- [ ] For protected endpoints, wire a shared 401 → refresh → retry-once → redirect-to-login handler (e.g. an HTTP client interceptor), not per-call-site logic.
- [ ] Never auto-retry 400/401(login)/403/404/409/429 — these need a human to change something.
- [ ] Do allow manual/backoff retry for 408/500/503 and network errors.
- [ ] Always log `requestId` when reporting an error to your own monitoring, especially for 500s.
