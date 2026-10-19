# Current Progress — SSH Key Checker

## Current Task
Done (2026-10-19): single-page SSH key pair checker, client-side only. Branch `feat/ssh-key-checker`, not pushed.

## Completed
- Key engine `src/lib/ssh-key.js`: OpenSSH, PEM PKCS#1, SEC1, PKCS#8 private keys; OpenSSH, RFC 4716, SPKI, PKCS#1 public
  keys; ED25519, RSA, ECDSA P-256/384/521; SHA256 fingerprint equal to `ssh-keygen -lf`; sign and verify pair check.
- One page: paste or upload (choose, drop, two files at once), human error messages (about 40 keys), swap, sample pair,
  copy fingerprint, FAQ, Terms and Privacy as native `<dialog>` sheets, Indonesian and English, light and dark.
- Scaffold auth, router and react-query removed; CSP `connect-src 'none'`, `form-action 'none'`, Trusted Types.
- DESIGN.md approved, ADRs 002 to 004, docs updated.

## Tests
`npm test` 19 passed (real ssh-keygen fixtures, 2,000-case fuzz). `npx playwright test` 23 passed. `make sast` 0 findings.
`npm audit --omit=dev` 0 vulnerabilities. Manual click-through in the browser pane: mismatch, match, English switch,
dialog open and Escape with focus back, 375 px (no overflow, tap targets 44 px), console clean, no request at check time.

## Important Decisions
See `docs/decisions.md` 002 to 004.

## Known Issues
- Legal dialogs hold sample text marked `[REAL DATA]` (Q3). `grep -rn "\[REAL DATA\]" src` must print nothing before release.
- File picking and drag and drop are covered by Playwright, not by hand in the browser pane (it cannot open a file chooser).
- The `≟` glyph falls back to a system font (IBM Plex Mono latin subset lacks it).

## Next Steps
1. Replace the `[REAL DATA]` legal text with the official text, and the hosting-log and contact lines.
2. Decide on hosting (HTTPS needed for WebCrypto) and push the branch.
