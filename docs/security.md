# Security — SSH Key Checker

## This project: handling private keys in the browser

> The sections below are the generic template for projects with a backend; most do not apply here (no API, no database,
> no accounts). What does apply is this section, plus the secrets, dependency and logging rules.

- **Nothing leaves the browser.** No `fetch`, XHR or WebSocket in the code, and the CSP forbids them anyway
  (`connect-src 'none'`, `form-action 'none'`). `e2e/checker.spec.js` proves it: only the page's own files load, and
  fetch, WebSocket and `sendBeacon` each end in a CSP violation.
- **Nothing is stored.** Keys live in React state until Clear, reload or closing the tab. No Web Storage, IndexedDB, cookie
  or URL (asserted by e2e). Cookies are only `lang` and `theme`. JavaScript cannot wipe strings from memory, so the docs
  do not claim it.
- **Passphrases are never requested.** Encrypted keys are not decrypted.
- **Textareas** disable spellcheck (Chrome's enhanced spellcheck sends text to Google), autocomplete, autocorrect and
  Grammarly, and ask password managers to ignore them.
- **Parsing is bounded**: 32 KB cap before parsing, every length field is bounds-checked, base64 is strict, curve names are
  looked up with `Object.hasOwn`, CryptoKeys are imported non-extractable (Ed25519 PKCS#8 uses an extractable key for a
  moment to derive the public half; it is re-imported non-extractable). A mutation fuzz checks that no input throws.
- **Errors never echo key text.** They are dictionary keys.
- **No `dangerouslySetInnerHTML`.** Comments from keys render as text; Trusted Types is required by the CSP.
- **Known limit**: a browser extension that can read every page can read what you paste. Stated in the FAQ.
- **Test keys** are made per run into a temp dir and deleted; nothing is committed (`*.pem`, `*.key` stay git-ignored).

## Secrets & Credentials

**Never hardcode:**
- API keys, access tokens, refresh tokens
- Database passwords
- Private/encryption keys
- JWT secrets, OAuth secrets
- SMTP passwords, service credentials

All secrets must come from **environment variables** or a **secret manager** (e.g., Vault).

### Configuration Pattern & Precedence

```
1. OS environment variables (runtime / secret manager)
        ↓ (when unset)
2. .env in the project root (`node --env-file-if-exists=.env`, KEY=value)
        ↓ (when unset in both)
3. Safe defaults in the zod schema of src/config/config.ts
```

- `src/config/config.ts` validates every variable at startup and refuses to start on an invalid value (fail fast).
  Errors name the variable, never its value.
- There is no default for secrets: anything required and unset stops the process.

### .env & Third-Party Credentials Rules

- `.env` is always git-ignored.
- Only `.env.example` is committed.
- **Third-Party APIs (Midtrans, Finpay, etc.)**: Always initialize with **dummy values** in `config.example.yml` and `.env.example` (e.g., `MIDTRANS_SERVER_KEY=SB-Mid-server-dummy-key`). Real keys must be provided manually by the developer in local `.env` or secret manager.
- Never commit real credentials to version control.
- Never log secret values — not even in debug mode.

### AI Agent Guardrails (`.claude/settings.json`)

The committed `.claude/settings.json` denies the agent the secret files (`.env`, `.env.*.local`, `config.yml`/`config.yaml`
and their `config.<env>.*` variants, `secret/`, `secret-auth/`, `*.pem`, `*.key`; examples such as `.env.example` and
`config.example.yml` stay readable), raw database shells, `make pg-copy-from`, and force-pushes.

> [!WARNING]
> These rules are **defense in depth, not a security boundary.** `Read()` denies also cover `cat`/`head`/`tail`/`sed` and
> redirections in Bash, but not a script that opens the file itself (`node -e`, `python -c`), a recursive `grep`, or a
> denied program run as `sh -c "…"` or by full path.
> For OS-level enforcement turn on the Claude Code sandbox in **your own** `.claude/settings.local.json` — the deny rules
> above are merged into it, so Bash subprocesses cannot read those files either:
>
> ```json
> { "sandbox": { "enabled": true, "allowUnsandboxedCommands": false } }
> ```
>
> It is not enabled here because it also restricts network and Docker access for every command (see the Claude Code
> sandboxing docs before enabling it). Real secrets belong in a secret manager; a local `.env` should only ever hold
> local-Docker credentials.

### Claude Code Plugins

Plugins run hooks on your machine with your permissions. They are installed by each developer at user scope from their
public marketplaces (see `README.md`) and are **not pinned**: `claude plugin update` pulls whatever the upstream
repository ships. Review a plugin's changes before updating it, and only install plugins from marketplaces you trust.

The `antislop` plugin also starts a local MCP server (`antislop-contrast`): a Python script from the plugin that computes
WCAG contrast ratios for two hex colors. It imports only the standard library and opens no network connection (checked on
v3.2.20), but it runs with your permissions like any plugin code, so read its changes before `claude plugin update`.

### Dependency Install Scripts

`.npmrc` sets `ignore-scripts=true`: `npm install` never runs a dependency's `preinstall`/`postinstall`, so a hijacked
package cannot run code on a developer machine or in CI. Keep it. Note that it also skips `pre*`/`post*` hooks of your
own npm scripts, so do not add any. A package that truly needs its install step: `npm rebuild <pkg> --ignore-scripts=false`
after reviewing what it runs.

### Database Environment Isolation

> [!CAUTION]
> **Strict Environment Isolation**: Automated workflows, CI pipelines, and unit/integration tests are strictly limited to the **local Docker container** (`localhost:5432`).
>
> Never allow scripts or automated agents to connect to, query, or execute migrations against **development (dev)**, **staging**, or **production (prod)** databases. Any remote database intervention must be conducted manually by the developer.

---

## Authentication & Authorization

### Architecture — Browser ↔ BFF ↔ API

Frontend and API may live on **different domains**, so browsers never hold tokens and never call the API directly:

```
Browser ──(HttpOnly; Secure; SameSite=Lax session cookie + CSRF token)──▶ BFF (same site as the FE)
BFF     ──(Authorization: Bearer <access token>, server-to-server)──────▶ Go API
```

- The **BFF** (Next.js route handlers / Nuxt server routes / a small server for SPAs) stores access + refresh tokens
  server-side or in `__Host-` prefixed `HttpOnly; Secure; SameSite=Lax; Path=/` cookies, refreshes them, and enforces CSRF
  (double-submit token + `Origin` check) on every state-changing request.
- The **Go API** stays stateless Bearer-JWT. CORS is off by default (`app.cors_allow_origin: []`) because no browser
  calls it; credentials are never allowed cross-origin.
- Tokens never touch `localStorage`/`sessionStorage` or JS-readable cookies.

### SPA without a BFF — `AUTH_COOKIE_MODE` (React/Vue Vite)

A Vite SPA has no server of its own, so it calls the API directly. Turn on cookie mode
(`AUTH_COOKIE_MODE=true`) and list the exact SPA origin in
`APP_CORS_ALLOW_ORIGIN` (the API refuses to start in cookie mode without it):

- `POST /v1/auth/login` and `/v1/auth/refresh` set the refresh token in `__Secure-refresh_token`
  (`HttpOnly; Secure; SameSite=Strict; Path=<base path>/v1/auth`) and **omit it from the body**. The access token is
  returned in the body and must live **only in the SPA's memory** (a reload restores it through `/v1/auth/refresh`).
- `/v1/auth/refresh` and `/v1/auth/logout` read the refresh token **only from the cookie**; logout always clears it.
- **CSRF:** every cookie-mode auth request needs an `Origin` from the allowlist **and** the header
  `X-CSRF-Protection: 1` (a cross-site form cannot send it, and it forces a CORS preflight). Missing either → `403`.
- CORS sends `Access-Control-Allow-Credentials: true` for the exact allowlisted origins only; never `*`.
- **Same site required:** SPA and API must share a registrable domain (`app.example.com` + `api.example.com`);
  browsers block third-party cookies, so different domains cannot work — use a framework with a BFF (Next, Nuxt,
  SvelteKit) instead.
- **Accepted trade-off:** XSS on the SPA can use the in-memory access token while the tab is open (not the refresh
  token). A strict CSP and no `dangerouslySetInnerHTML` / `v-html` without DOMPurify matter even more.
- Fetch with `credentials: "include"` only for `/v1/auth/*`; send the access token as `Authorization: Bearer`.
- **Sibling subdomains:** a `__Secure-` cookie can still be planted by another subdomain of the same site
  (`Domain=example.com`), which could log a victim into the attacker's session. `__Host-` would prevent it but forces
  `Path=/` (the cookie would reach every endpoint). Do not host untrusted content (user uploads, third-party pages) on a
  subdomain of the API's site; serve it from a separate registrable domain.

### JWT + Refresh Token Rotation

Use stateless JWT with short-lived access tokens and rotating refresh tokens.

**Token Lifetimes:**
| Token Type | TTL | Storage |
|---|---|---|
| Access Token | 15 minutes | BFF only (server-side / `HttpOnly` cookie) → sent to the API as `Authorization: Bearer` |
| Refresh Token | 7–30 days | BFF only, `__Host-` `HttpOnly; Secure; SameSite` cookie — never readable by JS |

**Implemented flow (`src/service/auth`, `src/pkg/auth-token`, `src/repository/redis/refresh-token`):**
1. Tokens are RS256 JWTs with `typ` (`access` | `refresh`), `iss` = `aud` = app name, `sub` = user UUID, unique `jti`.
   `verify` enforces the algorithm, expiry, issuer, audience **and type** — a refresh token is rejected by the
   auth middleware and an access token is rejected by `/auth/refresh` and `/auth/logout`. Issue both from one
   `newAuthToken({...})` with `.accessToken(key)` and `.refreshToken(ttlSec, key)`: each sets its
   own `typ`, `jti` and expiry (the refresh token also `fid`) on a copy of the shared claims.
2. **Login** starts a session family: Redis `auth:refresh:family:<fid>` = current refresh `jti` (TTL = refresh lifetime).
3. **Refresh** (`POST /v1/auth/refresh`) atomically swaps the current `jti` (Lua compare-and-set) and issues a new pair.
   Presenting an already-rotated token = **reuse** → the whole family is deleted and a warning is logged.
4. **Logout** (`POST /v1/auth/logout`, body: refresh token) deletes the family. Already-issued access tokens stay valid
   until they expire, which is why they live 15 minutes.
5. The BFF must serialize refreshes per session — two concurrent refreshes with the same token look like reuse.

**Login brute-force protection:** 5 failed attempts per email+IP and 20 per email (any IP) per 15 minutes → `429`.
Each attempt is counted atomically *before* the password check (a successful login takes its count back), so parallel
requests cannot slip past the limit. Redis keys hash the email (no PII). Unknown emails still run a bcrypt comparison
so timing does not reveal accounts. The client IP is the socket address; `X-Forwarded-For` is only read (from the
right) when the request comes from a configured trusted proxy (`APP_TRUST_PROXY`).
**Accepted trade-off:** anyone who knows an email can keep that account locked out of login (20 attempts per window,
from any IPs). If that matters for your users, add a CAPTCHA after a few failures or an unlock-by-email flow.

**Access Token Claims — Minimal PII:**
```go
type Claims struct {
    UserID string `json:"sub"`  // UUID only, no email/name
    Type   string `json:"typ"`  // access | refresh
    jwt.RegisteredClaims        // exp, iat, jti
}
// NEVER put: email, phone, full name, password hash in JWT claims (enforced: claims carry sub/typ only).
// No roles either: they are read per request, so assigning or revoking a role applies at once.
```

**Validation Rules:**
- Validate on every protected request via middleware.
- Verify: `exp` (not expired), `iat` (not in future), `iss` and `aud` (correct issuer/audience), signature.
- Reject tokens with `alg: none`.
- Use `RS256` (asymmetric) in production; `HS256` is acceptable only for internal services.

### RBAC (Role-Based Access Control)

The API enforces permissions (`roles` / `role_permissions` / `user_roles`); the frontend only hides what the user
cannot do and must never be the only check. Branch on `user.roles[].code` (immutable), never on the role `name`.

---

## Rate Limiting

### What ships

Login only (see "Login brute-force protection"): a fixed-window counter in Redis,
`rateLimitRepository.hit` (`src/repository/redis/rate-limit.ts`) — one Lua
script does `INCR` + `EXPIRE` on the first hit + `TTL`, so the count is atomic and a key can never lose its expiry.
Count **before** doing the guarded work; take a hit back (`Undo`/`undo`) only when the attempt must not count.

### Adding a limit

Reuse `Hit` with a key per identifier (hash PII such as emails: `sha256(email)`), reject with `429` and the remaining
TTL when the count exceeds the limit. A fixed window allows up to 2× the limit around a window boundary; if that
matters (e.g. paid API quotas), switch that limiter to a sliding window (sorted set: `ZADD` now, `ZREMRANGEBYSCORE`
older than the window, `ZCARD`, `EXPIRE`, in one Lua script).

**Rate Limit Tiers:**

| Endpoint Category | Limit | Window | Identifier |
|---|---|---|---|
| Auth login (shipped) | 5 attempts / 20 attempts | 15 minutes | email + IP / email |
| OTP send | 3 req | 5 minutes | phone/email |
| OTP verify | 5 attempts | 10 minutes | phone/email |
| General API (authenticated) | 1000 req | 1 minute | user_id |
| General API (unauthenticated) | 60 req | 1 minute | IP |
| File upload | 10 req | 1 hour | user_id |

**Response headers (when you add a general API limiter):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1716900000
Retry-After: 60  (only on 429)
```

---

## OWASP Top 10 Checklist (2021)

| # | Vulnerability | Status | Mitigation |
|---|---|---|---|
| A01 | Broken Access Control | ☐ | Permission check on every protected route; `:own` scope filters by `created_by`; IDs come from the path only, never the body |
| A02 | Cryptographic Failures | ☐ | bcrypt cost ≥ 12 for passwords; TLS everywhere; no MD5/SHA1 for sensitive data; encrypt PII fields at rest |
| A03 | Injection | ☐ | Parameterized queries via ORM only; never concatenate user input into SQL, shell, or LDAP queries |
| A04 | Insecure Design | ☐ | Threat model per feature; rate limiting on auth; token rotation; least privilege DB user |
| A05 | Security Misconfiguration | ☐ | Security headers (see below); disable debug endpoints in production; no default credentials |
| A06 | Vulnerable Components | ☐ | `go list -m all` / `npm audit` in CI; pin versions; remove unused dependencies |
| A07 | Auth & Session Failures | ☐ | JWT rotation; no session fixation; secure cookie flags; account lockout after N failures |
| A08 | Software & Data Integrity | ☐ | Verify webhook signatures (HMAC); sign build artifacts; no untrusted deserialization |
| A09 | Logging & Monitoring Failures | ☐ | Structured audit log; no PII in logs; alert on repeated 401/403/429; retain logs ≥ 90 days |
| A10 | SSRF | ☐ | Allowlist outbound URLs; reject private/loopback addresses in user-supplied URLs; no raw `http.Get(userInput)` |

---

## Input Sanitization & Validation

**Rules:**
- Validate all incoming request data **before** any processing or database operation.
- Use strict schema validation (go-playground/validator for Go, zod for TypeScript).
- **Reject unexpected fields** — use allowlist-based binding, not denylist.
- Validation is about **integrity** (type, length, format, enum allowlist) — it is NOT the defense against injection:
  - **SQL injection** → parameterized queries + identifier allowlists (see [SQL Injection Prevention](#sql-injection-prevention)).
  - **XSS** → context-aware output encoding + CSP (see [XSS Prevention](#xss-prevention)).
  - Do not "sanitize" (strip characters from) input to stop SQLi/XSS — it corrupts legitimate data (`O'Brien`) and still misses payloads.
- File paths: resolve with `filepath.Clean` and verify the result stays inside the allowed base directory.
- Never pass raw user input to `fmt.Sprintf`-built SQL, `exec.Command`, or shell strings.

```go
// Go: strict binding + validation pattern
type CreateUserRequest struct {
    Name     string `json:"name"     validate:"required,min=2,max=100"`
    Email    string `json:"email"    validate:"required,email"`
    Password string `json:"password" validate:"required,min=8,max=72"`
}

// In handler:
var req dto.CreateUserRequest
if err := c.Bind(&req); err != nil {
    return response.ErrorBadRequest(err).Send(c)
}
if err := c.Validate(req); err != nil {
    return response.ErrorBadRequest(err).Send(c)
}
```

---

## Security Headers

Apply on every response. The API sets them in `src/middleware/security` (no extra dependency): JSON routes get a deny-all CSP and `Cache-Control: no-store`.

**Required headers in production:**

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (legacy auditor disabled — CSP is the real protection) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | At minimum: `default-src 'self'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

---

## SQL Injection Prevention

- Use parameterized queries / ORM query builders **exclusively**.
- Never concatenate user input into SQL strings.
- With Drizzle: use the query builder (`eq`, `ilike`, `inArray`, ...) or the `sql` tag, which parameterizes every
  interpolated value. Never use `sql.raw()` with request data.

```ts
// ✅ Safe — parameterized
db.select().from(users).where(sql`lower(${users.email}) = ${email}`);

// ❌ DANGEROUS — never do this
db.execute(sql.raw(`SELECT * FROM users WHERE email = '${email}'`));
```

**Identifiers cannot be parameterized.** Sort fields from the request (`?sort_by=`) MUST go through an allowlist:

```ts
// ✅ Safe — unknown fields are ignored, direction is DESC only for "desc" (src/dto/<entity>)
export const userSortColumns: SortColumns = { name: users.name, created_at: users.createdAt };
applyFilter(query, f, userSortColumns);
```

Every new filter declares its own `<entity>SortColumns`. `src/abstraction/pagination.test` guards the behavior
(including `constructor`/`__proto__`, which must never resolve to prototype members).

---

## XSS Prevention

- **Encode on output, by context.** React/Vue/Svelte escape text interpolation by default — keep it that way.
- **Banned without DOMPurify sanitization:** `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML`, `document.write`, `eval`, `new Function`.
- Never build URLs for `href`/`src` from user input without allowing only `https:` (block `javascript:` / `data:`).
- **CSP** on every HTML response: start from `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` and avoid `'unsafe-inline'` for scripts (use nonces/hashes).
- APIs return `Content-Type: application/json` with `X-Content-Type-Options: nosniff`, so a JSON body can never be sniffed as HTML.
- Tokens never live in `localStorage`/`sessionStorage` — any XSS can read them. Auth uses `HttpOnly; Secure; SameSite` cookies (see Authentication).

---

## CORS

- **Off by default.** Browsers reach the API through the BFF (server-to-server), which needs no CORS.
- Only when a browser must call the API directly, list exact origins in `APP_CORS_ALLOW_ORIGIN` (comma-separated). Never `*`.
- `Access-Control-Allow-Credentials: true` is sent **only in cookie mode** (`AUTH_COOKIE_MODE`, see "SPA without a BFF"),
  and only for those exact origins. Never turn it on for any other reason.
- Implemented in `src/middleware/cors` (exact-origin allowlist from `APP_CORS_ALLOW_ORIGIN`, comma-separated).

---

## HTTPS / TLS

- Always use HTTPS in staging and production.
- Do not disable TLS verification in production code (`InsecureSkipVerify: false`).
- Use TLS 1.2 minimum; prefer TLS 1.3.

---

## Audit Logging

Every state-changing operation must produce a structured audit log entry.

**Required fields per audit event:**
```json
{
  "timestamp": "2026-09-29T00:00:00Z",
  "actor_id": "uuid-of-user-performing-action",
  "actor_ip": "203.0.113.1",
  "actor_role": "admin",
  "action": "user.delete",
  "resource_type": "user",
  "resource_id": "uuid-of-affected-resource",
  "old_value": { "status": "active" },
  "new_value": { "status": "deleted" },
  "request_id": "x-request-id-header-value",
  "result": "success"
}
```

**Rules:**
- Audit logs must be **append-only** — never update or delete audit records.
- Store in a dedicated `audit_logs` table or separate append-only storage.
- Minimum retention: **12 months** (adjust per regulatory requirement).
- Sensitive fields in `old_value`/`new_value` must be redacted (password hashes, tokens).

---

## File Upload Security

- Validate **both** MIME type (Content-Type header) AND file magic bytes (first N bytes of content).
- Enforce maximum file size (e.g., 10MB) before reading the body.
- Store uploads **outside the web root** or in dedicated object storage (e.g., MinIO, S3).
- Never execute uploaded files.
- Generate a random UUID filename server-side — never use the client-supplied filename.
- Scan for malware if handling untrusted binary files (ClamAV integration).

```go
// Go: magic bytes validation example
func validateFileMagicBytes(header *multipart.FileHeader, allowed []string) error {
    f, _ := header.Open()
    defer f.Close()
    buf := make([]byte, 512)
    f.Read(buf)
    mimeType := http.DetectContentType(buf)
    for _, a := range allowed {
        if strings.HasPrefix(mimeType, a) { return nil }
    }
    return errors.New("invalid file type")
}
```

---

## SSRF Prevention

- Validate and allowlist URLs before making server-side HTTP requests.
- Do not pass raw user input as HTTP request targets.
- Block requests to private/loopback addresses (10.x.x.x, 172.16.x.x, 192.168.x.x, 127.x.x.x, ::1).

---

## Logging Security

**Never log:**
- Passwords, tokens, private keys
- Full authorization headers
- Sensitive customer data (PII, payment info)
- OTP codes, verification codes

Use structured logging with field-level redaction for sensitive fields.

---

## Dependency Security

- Audit dependencies regularly (`go list -m all` / `npm audit`).
- Pin dependency versions in `go.sum` / `package-lock.json`.
- Do not add a dependency for functionality that can be implemented in a few lines.
- Run `govulncheck ./...` (Go) or `npm audit --audit-level=high` in CI.

---

## Password Security

- Hash passwords with **bcrypt** (cost factor ≥ 12).
- Do not store plain-text passwords.
- Do not store password hints.
- Implement account lockout: after 5 failed attempts, lock for 15 minutes (use Redis cooldown).

---

## Privacy & PII Protection

> [!IMPORTANT]
> Privacy is a first-class concern, not an afterthought. Apply these rules from day one.

### PII Minimization

- **Only collect data that is strictly necessary** for the feature to function.
- Before adding any personal data field, ask: *"Can this feature work without this data?"*
- Do not collect date of birth if only age verification is needed.
- Do not store device fingerprints unless explicitly required for fraud prevention.

**PII fields that require special handling:**
- Full name, email, phone number, national ID (KTP/NIK)
- Location data (GPS coordinates, address)
- Financial data (account numbers, transaction history)
- Health data, biometric data

### Encryption at Rest (Sensitive Fields)

Sensitive PII fields must be encrypted at the database column level, not just at the disk level.

```go
// Pattern: AES-256-GCM encryption for PII columns
// Encrypt before Save, Decrypt after Load
// Key stored in secret manager / environment variable — NEVER in source

// Columns that MUST be encrypted:
// - phone_number
// - national_id (KTP/NIK)
// - bank_account_number
// - anything considered "sensitive" per UU PDP
```

### Logging Redaction Rules

```go
// ✅ Safe — redacted structured log
logger.Info("user login",
    zap.String("user_id", userID),
    zap.String("ip", ip),
    zap.String("email", maskEmail(email)), // "j***@example.com"
)

// ❌ Never — raw PII in logs
logger.Info("user login: " + email + " from " + ip)

// Masking helpers:
// maskEmail("john@example.com")   → "j***@example.com"
// maskPhone("+6281234567890")     → "+628*****7890"
// maskNationalID("3271234567890") → "327*********"
```

### Audit Trail Immutability

- Audit logs are **write-once**. No `UPDATE` or `DELETE` on `audit_logs` table.
- Use a separate database role with INSERT-only permission for the audit log writer.
- Consider write-once object storage (S3 Object Lock / MinIO Object Lock) for critical audit events.

### Data Retention Policy

| Data Category | Retention Period | Action After |
|---|---|---|
| User accounts (active) | Indefinite while active | Soft-delete on request |
| User accounts (deleted) | 30 days post-deletion | Hard delete + anonymize |
| Audit logs | 12 months minimum | Archive to cold storage |
| Access logs / request logs | 90 days | Delete |
| Transaction records | 5 years (regulatory) | Archive |
| OTP / temp tokens | 10–15 minutes TTL | Auto-expire in Redis |
| Session / refresh tokens | Per token TTL | Auto-expire |

**Right to Erasure (UU PDP / GDPR):**
- Provide a documented process for user data deletion requests.
- Deletion = anonymize PII fields (replace with `[DELETED]` or NULL), not hard delete of records.
- Cannot delete audit log entries — anonymize the `actor_id` reference instead.

### Third-Party Data Sharing Policy

- **API partners must NEVER receive raw PII** without explicit user consent.
- Always anonymize or pseudonymize data before sending to analytics/third-party services.
- Log every third-party data share event in the audit log.
- Review third-party data processing agreements (DPA) before integration.
- No user data to be sent to AI/ML services (e.g., OpenAI, Gemini) without explicit consent.
