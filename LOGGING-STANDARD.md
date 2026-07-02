# Backend Logging Standard

**Date:** 2026-07-02
**Status:** Adopted
**Applies to:** `api/` (ASP.NET Core 9, Serilog)

## Goal

Every API event is observable end to end:

1. **Event input** – each incoming request is logged with its data (sanitized).
2. **Event response** – each outgoing response is logged with its status, timing, and payload summary.
3. **Failure reason** – for any non-2xx result, log **why** (e.g. `email_not_found`,
   `invalid_credentials`, `account_blocked`), not just the status code.

The two log lines for one request are tied together by a **correlation id**.

## Principles

- **Structured logging only.** Use Serilog message templates with named properties
  (`{Email}`, `{UserId}`), never string interpolation. Properties are queryable; concatenated
  strings are not.
- **The middleware owns the envelope.** Request-in / response-out logging is automatic for
  every endpoint via `RequestResponseLoggingMiddleware`. Controllers do **not** hand-write
  "request received" / "returning 200" lines.
- **Controllers own the reason.** When a controller returns a non-2xx result, it must attach a
  machine-readable **reason code** so the middleware can log it. Use the `ApiControllerBase`
  helpers (below).
- **Never log secrets.** Passwords, tokens, secrets, and auth headers are redacted before
  logging. This is enforced centrally in the middleware; do not defeat it.

## Log levels

| Level | When |
|---|---|
| `Debug` | Fine-grained internal steps (disabled in Production by config) |
| `Information` | Request input; successful (2xx/3xx) response; notable domain events |
| `Warning` | Client-error response (4xx) – bad input, auth failure, not found, throttling |
| `Error` | Server-error response (5xx) and unhandled exceptions |
| `Fatal` | Process cannot continue (startup/host failure) |

## The two mandatory log lines

For every `/api/*` request the middleware emits:

**1. Event input**
```
HTTP request  {Method} {Path}{QueryString}  user={UserId} ip={ClientIp} body={RequestBody}
```
Properties: `CorrelationId`, `Method`, `Path`, `QueryString`, `UserId`, `ClientIp`,
`RequestBody` (sanitized JSON, or `[omitted]` for non-JSON / oversized / file uploads).

**2. Event response**
```
HTTP response {Method} {Path} => {StatusCode} in {ElapsedMs}ms reason={FailureReason}
```
Properties: `CorrelationId`, `Method`, `Path`, `StatusCode`, `ElapsedMs`, `FailureReason`
(present only for non-2xx), `ResponseBody` (sanitized, non-2xx only).

`CorrelationId` is taken from the inbound `X-Correlation-ID` header if present, otherwise
generated, and echoed back on the response so clients/proxies can correlate.

## Failure reasons – the required part

A non-2xx response must carry a **reason code**: a short, stable, `snake_case` string that
names the cause. It is machine-grep-able and never localized.

Set it via `ApiControllerBase`:

```csharp
// Instead of:
return Unauthorized(new { message = "Invalid email or password" });

// Do:
return UnauthorizedReason("invalid_credentials", "Invalid email or password");
```

The helper both (a) returns the response body `{ message, reason }` and (b) stores the reason
in `HttpContext.Items["FailureReason"]` so the middleware logs it on the response line.

If a controller returns a raw `NotFound()` / `BadRequest(new { message })` without a helper,
the middleware falls back to reading the `message` field from the response body – so legacy
code still logs *something* useful, but new/updated code must use reason codes.

### Reason-code conventions

- `snake_case`, lowercase, stable over time (they are searched in dashboards/alerts).
- Name the cause, not the HTTP status: `email_not_found`, not `not_found_404`.
- Reuse across endpoints where the meaning matches (`unauthorized`, `forbidden`,
  `validation_failed`, `rate_limited`, `not_found`, `conflict`).

Examples:

| Situation | Status | Reason code |
|---|---|---|
| Login, unknown email or bad password | 401 | `invalid_credentials` |
| Login, email not yet verified | 401 | `email_not_verified` |
| Login, account blocked | 403 | `account_blocked` |
| Login, account frozen | 403 | `account_frozen` |
| Resource id not found | 404 | `not_found` |
| Body fails validation | 400 | `validation_failed` |
| Not an editor/admin | 403 | `forbidden` |
| Throttled | 429 | `rate_limited` |

## What is and isn't logged

- **Logged:** all `/api/*` requests and responses.
- **Skipped (noise):** `/health`, static assets (`/assets/*`), and the SPA fallback
  (non-API routes). These never carry business events.
- **Redacted keys (case-insensitive substring match):** `password`, `token`, `secret`,
  `honeypot`, `authorization`. Values become `***`.
- **Bodies not logged verbatim:** non-JSON content, bodies over the size cap (32 KB), and
  file uploads log `[omitted]`.

## Applying the standard to a controller

1. Inherit `ApiControllerBase` instead of `ControllerBase`.
2. Return failures through the reason helpers: `NotFoundReason`, `BadRequestReason`,
   `UnauthorizedReason`, `ForbiddenReason`, `ConflictReason`, or `Fail(status, reason, message)`.
3. Add domain-context logs (`_logger.Log*`) only for things the envelope can't see – e.g.
   "honeypot triggered", "suggestion auto-approved". Do **not** re-log the request/response.

## Configuration

Levels are controlled in `appsettings*.json` under `Logging:LogLevel` / Serilog `MinimumLevel`.
Production runs at `Information`; set `Default: Debug` in `appsettings.Development.json` for
verbose local tracing. Logs go to console and a daily-rolling file (`logs/app-*.log`,
30-day retention), configured in `Program.cs`.

## Non-goals (future)

- Shipping logs to a central sink (Seq / Elastic / Loki) – add a Serilog sink when needed.
- PII policy beyond secret redaction (emails/usernames are currently logged for support/audit).
- Request/response sampling for high-volume endpoints.
