# Architecture Decisions — Ssh Key Checker

This file records significant architectural decisions for **Ssh Key Checker**.

Use the format below. Only record decisions that have lasting impact on the architecture.

---

## Decision 001 — Framework Selection

**Decision**: Use React/Vite (Frontend SPA) as the primary framework.

**Context**: Project initialized on 2026-10-19.

**Reason**: React/Vite (Frontend SPA) was selected based on team familiarity, ecosystem maturity, and project requirements.

**Consequences**: Project structure follows React/Vite (Frontend SPA) conventions. Adding a different framework would require significant restructuring.

---

## Decision 002 — Client-only key checking with WebCrypto (2026-10-19)

**Decision**: The product is one SPA page. Keys are parsed and verified in the browser with WebCrypto, `BigInt` and
`atob`; there is no backend, no crypto library and no network request after load.

**Context**: The input is SSH private keys. The developer asked that nothing leaves the browser.

**Reason**: A server would have to be trusted with secrets. In the browser the CSP (`connect-src 'none'`,
`form-action 'none'`) lets the browser refuse any outgoing connection, even from injected code, and an e2e test proves it.

**Consequences**: Needs a secure context (localhost or HTTPS). Passphrase-protected keys are never decrypted (no
passphrase prompt): an OpenSSH key gets a public-part check, PEM/PKCS#8 get an explanation. Ed25519 needs a browser with
WebCrypto Ed25519 (Chrome 137+, Firefox 129+, Safari 17+); others get a clear message.

## Decision 003 — Scaffold auth removed (2026-10-19)

**Decision**: Removed the login/dashboard pages, `src/lib/auth`, the mock API, `react-router` and
`@tanstack/react-query`. The page is rendered at `/`; any other path is the not-found screen.

**Reason**: No account and no API exist. Dead auth code is attack surface and implies a backend that is not there.

**Consequences**: `AUTH_COOKIE_MODE`, `VITE_API_BASE_URL` and the `/v1` proxy are gone. Bringing back a backend means a new ADR.

## Decision 004 — Design direction approved (2026-10-19)

**Decision**: Paper and ink palette with one brass accent, Instrument Sans and IBM Plex Mono self-hosted through
`@fontsource-variable/instrument-sans` and `@fontsource/ibm-plex-mono` (OFL-1.1), the `≟ = ≠` comparison motif, dials
ENERGY 2 / RHYTHM 1 / MOTION 1. Inspiration from 21st.dev components (hero as product, compact file row, status line,
sheet dialogs), built with native elements and no UI library.

**Reason**: See `DESIGN.md` (each choice has its one-line reason). Fonts are the only new dependencies.

**Consequences**: The legal dialogs hold dummy but complete text (structure after ISO/IEC 29100 principles, no compliance
claim, dummy data disclosed in a note). The developer asked for it on 2026-10-19 instead of `[REAL DATA]` markers; replace
the provider, address, contacts and jurisdiction with official data before a release.

## Decision Template

```
## Decision NNN — Short Title

**Decision**: ...

**Context**: ...

**Reason**: ...

**Consequences**: ...
```

Keep decisions focused and avoid lengthy explanations.
Only record decisions that are not obvious from the code.
