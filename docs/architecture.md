# Architecture — SSH Key Checker

React/Vite single-page app, static files only (nginx in the Dockerfile). **No backend and no API.**

```
Browser: CheckerPage ──▶ src/lib/ssh-key.js ──▶ WebCrypto (crypto.subtle)      nothing leaves the page
```

- `src/lib/ssh-key.js`: reads private keys (OpenSSH, PEM PKCS#1, SEC1, PKCS#8) and public keys (OpenSSH line, RFC 4716,
  SPKI, PKCS#1), computes the `SHA256:` fingerprint, and `checkPair` compares fingerprints then signs random bytes with the
  private key and verifies them with the public key. Every reader resolves to `{ ok, key | error }`; an error is a key of
  `errors` in the dictionaries, never text and never key material. `samplePair` makes a throwaway Ed25519 pair.
- `src/pages/CheckerPage.jsx`: the one page. Keys live in React state only: no Web Storage, IndexedDB, cookie or URL.
  `components/molecules/KeyField` (textarea, file choose or drop, status line), `organisms/PairResult`,
  `organisms/LegalDialog` (native `<dialog>`: terms and privacy open on the same page).
- CSP (`<meta>` injected at build by `vite.shared.js`, headers in `nginx.conf`): `connect-src 'none'`,
  `form-action 'none'`, `require-trusted-types-for 'script'`. Production needs HTTPS (WebCrypto is secure-context only).
- `public/theme.js` applies the saved theme before first paint (blocking file, no inline script). Indonesian and English:
  `src/i18n/{id,en}`, `src/lib/lang*`; a switch re-renders in place.
- `index.html` says `noindex`: a SPA tool, not a page that must rank. Routes: `/` and the not-found screen.

## Testing

- `npm test`: key engine against real `ssh-keygen` output (fixtures made into a temp dir by `e2e/keys.mjs` and deleted),
  fingerprints equal `ssh-keygen -lf`, every error key, a 2,000-case mutation fuzz, language dictionaries in step.
- `make test-e2e`: Playwright on the production build: flows, uploads, drag and drop, dialogs, keyboard, no outgoing request,
  CSP blocks fetch, WebSocket and beacon, nothing stored, works offline, language switch keeps keys.
- `make ui-shots`: every state at 375, 768 and 1280 px, light and dark, both languages, into `ui-shots/`.
