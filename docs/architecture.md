# Architecture — Ssh Key Checker

React/Vite (Frontend SPA) on Vite (static files, no server of its own). It calls the API directly, so the API runs in
**`AUTH_COOKIE_MODE`** (see `docs/security.md`, "SPA without a BFF").

```
Browser ──(Bearer, from memory)──────────────▶ API /v1/*
        ──(HttpOnly refresh cookie, CSRF hdr)─▶ API /v1/auth/{login,refresh,logout}
```

- **Same site required:** this app and the API share a registrable domain (`app.example.com` + `api.example.com`).
  Different domains cannot work (third-party cookies are blocked): use Next, Nuxt or SvelteKit (BFF) instead.
- `src/lib/auth` keeps the access token **only in memory**; a reload restores it with `/v1/auth/refresh` (one
  refresh in flight at a time). No token in `localStorage`, `sessionStorage` or a readable cookie.
- `public/theme.js` applies the saved theme (`theme` cookie, `light` or `dark`) to `<html data-theme>` before the first
  paint: a blocking script file, because the CSP forbids inline scripts. `src/lib/theme` and `ThemeToggle` switch and
  persist it; without a choice the OS preference decides (see `docs/design_system.md`).
- Indonesian and English: strings in `src/i18n/id` and `src/i18n/en`, `src/lib/lang` (allowlist, `DEFAULT_LANG`,
  `pageTitle`, `loginError`) and `src/lib/lang-client` (the `lang` cookie). `src/main` sets `<html lang>` from the
  cookie at start-up; `src/lib/lang-context` (`useLang()`) and `LangToggle` switch it in place, so a form keeps what
  the user typed.
- No public page: a SPA renders meta tags with JavaScript, which social previews and many crawlers never run.
  `index.html` says `noindex` on every route and `public/robots.txt` lets crawlers read it. The legal pages (`/privacy`,
  `/terms`, from `PUBLIC_PAGES` in `src/lib/seo`) follow the `lang` cookie and say `[REAL DATA]` until you supply
  their text.
- Accepted trade-off: an XSS on this page can use the access token while the tab is open. The CSP (`<meta>` injected
  at build, full headers in `nginx.conf`), no `dangerouslySetInnerHTML`/`v-html`, and no third-party scripts matter.

## Development

`make run` serves on http://localhost:5173 and proxies `/v1` to `API_PROXY_TARGET`, so the cookie flows same-origin.
Configure the API with `AUTH_COOKIE_MODE=true` and `APP_CORS_ALLOW_ORIGIN=http://localhost:5173`.
In production set `VITE_API_BASE_URL` (public, build time) to the API origin.

## Testing

- `npm test`: the auth client (memory token, single-flight refresh, 401 retry) with a mocked `fetch`; the language
  allowlist and that both dictionaries have the same keys.
- `make test-e2e`: Playwright against the production build (`vite preview`) and `e2e/mock-api.mjs` in cookie mode:
  login, reload keeps the session, logout, no token in JS-readable storage, no CSP violations; the theme toggle (OS default,
  override, persistence); a language switch translates in place and keeps typed values (`e2e/lang.spec`); every route
  says noindex (`e2e/seo.spec`).
- `make ui-shots`: the same build, a screenshot of every screen (privacy included) at 375, 768 and 1280 px (Indonesian in light and dark,
  English in light) into `ui-shots/` (git-ignored: open them and look); fails on horizontal overflow, console errors,
  a wrong `<title>` or `lang`, or a screen without both toggles.
