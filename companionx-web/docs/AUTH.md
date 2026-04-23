# Authentication System

## Architecture

Two separate servers, same-origin at the browser level (cookies are shared):

| Layer | URL | Role |
|-------|-----|------|
| Frontend (Next.js) | `localhost:3000` | SPA, RSC rendering, route protection |
| Backend (Laravel) | `localhost:8000` | Session store, auth logic, API |

Both are treated as same-origin by the browser because requests are made from the browser (port 3000) to the API (port 8000) with credentials included, and CORS is configured to allow it.

---

## Cookie Names

Laravel generates the session cookie name via `Str::slug()` on `APP_NAME`:

```
APP_NAME = "Laravel"
Str::slug("Laravel") = "laravel"
cookie = "laravel" + "-session" = "laravel-session"
```

The cookie is set on path `/`, with `httpOnly=true`, `sameSite=lax`.

Other cookies set during auth:

- `XSRF-TOKEN` — CSRF token for subsequent requests (set by `GET /sanctum/csrf-cookie`)
- `laravel_session` (also accepted by middleware for legacy compatibility)

---

## Auth Flow

### 1. Login

```
Browser                      Next.js                    Laravel
   │                             │                         │
   │──onClick login──────────────▶│                         │
   │                             │──GET /sanctum/csrf-cookie──────────▶│
   │                             │                         │ Sets: XSRF-TOKEN, laravel-session
   │                             │◀───────────────────────────────────│
   │                             │                         │
   │                             │──POST /api/login─────────────────────▶│
   │                             │  body: {email, password}            │
   │                             │  headers: X-XSRF-TOKEN              │
   │                             │  cookies: laravel-session         │
   │                             │                         │ Auth::attempt() validates credentials
   │                             │                         │ Regenerates session
   │                             │                         │ Sets/updates laravel-session cookie
   │                             │◀───────────────────────────────────│
   │                             │  { user: {...} }                   │
   │◀──redirect to /dashboard────│                         │
```

**Files:**
- `companionx-web/lib/auth.ts:42` — `login()` calls `ensureCsrfCookie()` then `POST /api/login`
- `companionx-web/lib/auth.ts:29` — `ensureCsrfCookie()` calls `GET /sanctum/csrf-cookie`
- `companionx-api/app/Http/Controllers/Api/AuthController.php:47` — `login()` validates and calls `Auth::attempt()`
- `companionx-api/config/sanctum.php:37` — `guard` set to `['web']` (uses web session guard)

**CSRF Protection:**
- Every `POST/PUT/DELETE` request from Next.js must include the `X-XSRF-TOKEN` header
- Axios instance (`lib/axios.ts`) is configured with `withXSRFToken: true`, which automatically reads the `XSRF-TOKEN` cookie and attaches it as the `X-XSRF-TOKEN` header on every request
- The `XSRF-TOKEN` cookie is set by `GET /sanctum/csrf-cookie` and is HttpOnly (can't be read by JS), but the browser automatically sends it with cross-site requests

### 2. Session Validation

Every protected page (dashboard, journal, etc.) validates the session by calling `GET /api/me`:

```
Browser                      Laravel
   │                           │
   │──GET /api/me─────────────────────────────▶│
   │  cookies: laravel-session, XSRF-TOKEN     │
   │  headers: X-XSRF-TOKEN                  │
   │                           │ auth:sanctum middleware validates session
   │                           │ Loads user from DB via session
   │◀────────────────────────────────────────│
   │  { id, first_name, ..., system_role }     │
```

**Files:**
- `companionx-web/lib/auth.ts:33` — `fetchCurrentUser()` calls `GET /api/me`, returns `null` on 401/error
- `companionx-web/app/dashboard/page.tsx:31` — `fetchCurrentUser()` on mount, redirects to `/login` if `null`
- `companionx-web/app/page.tsx:26` — `fetchCurrentUser()` in Nav, shows avatar if user exists

**The `/api/me` endpoint is the real auth check.** Laravel's `auth:sanctum` middleware reads the `laravel-session` cookie, looks up the session in the DB, loads the associated user, and returns it. If the session is invalid or expired, it returns 401.

### 3. Route Protection (Middleware)

Next.js middleware intercepts RSC (React Server Component) requests before React code runs:

```
Browser                      Next.js
   │                         │
   │──router.push("/dashboard")──│  (RSC request with cookies)
   │                         │
   │                         │──reads laravel-session or laravel_session cookie
   │                         │
   │  ┌─ exists? ──── NO ────▶│──307 /login
   │  │                                    │
   │  └─ YES ── protected? ── NO ────────────▶│──proceed
   │                  │                        │
   │                  └─ YES ────────────────▶│──307 /dashboard
```

**Files:**
- `companionx-web/middleware.ts:3` — checks `laravel-session` (or `laravel_session`) cookie presence
- `companionx-web/middleware.ts:25` — matcher: `["/", "/dashboard/:path*", "/login", "/register"]`

**This is a coarse gate.** It only checks cookie presence (not validity). A cookie named `laravel-session` with any random value will pass middleware. The actual validation happens when React code calls `fetchCurrentUser()` → `/api/me`.

### 4. Logout

```
Browser                      Next.js                    Laravel
   │                             │                         │
   │──onClick logout──────────────▶│                         │
   │                             │──POST /api/logout───────────────▶│
   │                             │                         │ Auth::logout() + session invalidate
   │                             │                         │ Clears session from DB
   │                             │◀───────────────────────────────────│
   │◀──redirect to / ───────────│                         │
```

**Files:**
- `companionx-web/lib/auth.ts:54` — `logout()` calls `POST /api/logout`
- `companionx-api/app/Http/Controllers/Api/AuthController.php:69` — invalidates and regenerates session

---

## Sanctum Configuration

Sanctum is configured with the `web` guard (session-based, not token-based):

- `companionx-api/config/sanctum.php:37` — `'guard' => ['web']`
- `companionx-api/config/sanctum.php:18` — `stateful` includes `localhost:3000` so Sanctum knows to issue session cookies for requests from that origin
- `companionx-api/config/sanctum.php:78` — `AuthenticateSession` middleware is enabled (helps with logout across tabs)

### CSRF in Sanctum Context

Sanctum uses Laravel's built-in CSRF middleware. Here's how it works end-to-end:

1. `GET /sanctum/csrf-cookie` — Laravel sets `XSRF-TOKEN` cookie (encrypted, HttpOnly)
2. Browser stores the cookie (cannot read it — HttpOnly) but browser can send it as a header via `X-XSRF-TOKEN`
3. Axios `withXSRFToken: true` reads `XSRF-TOKEN` from `document.cookie` and sets `X-XSRF-TOKEN` header on every request
4. Laravel's `VerifyCsrfToken` middleware decrypts the header, compares with token in session, rejects if mismatch

---

## Key Files

### Frontend
| File | Purpose |
|------|--------|
| `lib/auth.ts` | `login()`, `register()`, `logout()`, `fetchCurrentUser()`, `ensureCsrfCookie()` |
| `lib/axios.ts` | Axios instance with `withCredentials`, `withXSRFToken` configured |
| `middleware.ts` | Cookie-based route protection for RSC requests |
| `app/login/page.tsx` | Login form UI |
| `app/register/page.tsx` | Registration form UI |
| `app/dashboard/page.tsx` | Dashboard — calls `fetchCurrentUser()` on mount, guards if null |
| `app/page.tsx` | Landing page Nav — calls `fetchCurrentUser()`, shows avatar if logged in |

### Backend
| File | Purpose |
|------|--------|
| `app/Http/Controllers/Api/AuthController.php` | `login()`, `register()`, `logout()`, `me()` |
| `routes/api.php` | Auth routes with `auth:sanctum` and `patient` middleware |
| `config/session.php` | Session driver, cookie name (`laravel-session`), lifetime |
| `config/sanctum.php` | Stateful domains, `web` guard |
| `config/cors.php` | CORS: allows port 3000, `supports_credentials: true` |

---

## Security Considerations

1. **Middleware only checks presence** — Cookie validity is enforced by `/api/me` (Laravel validates the session against the DB). An attacker with a browser could set `laravel-session=foo` and hit RSC routes, but they'd get empty data from `/api/me` and broken UIs.

2. **CSRF tokens prevent cross-site attacks** — All state-changing requests require `X-XSRF-TOKEN`. Axios sends it automatically.

3. **Session stored in DB** — Laravel uses database session driver (`SESSION_DRIVER=database`), so sessions persist across server restarts.

4. **Session lifetime** — `SESSION_LIFETIME=120` minutes. Sessions expire after 2 hours of inactivity.

5. **Sanctum `AuthenticateSession` middleware** — Enabled in `sanctum.php`, helps invalidate sessions across browser tabs on logout.