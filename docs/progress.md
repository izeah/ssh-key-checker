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
`npm test` 22 passed (real ssh-keygen fixtures, 2,000-case fuzz). `npx playwright test` 27 passed. `make sast` 0 findings.
`npm audit --omit=dev` 0 vulnerabilities. Manual click-through in the browser pane: mismatch, match, English switch,
dialog open and Escape with focus back, 375 px (no overflow, tap targets 44 px), console clean, no request at check time.

## Important Decisions
See `docs/decisions.md` 002 to 004.

## Known Issues
- Legal dialogs hold dummy data (provider, address, contacts at `example.com`, South Jakarta jurisdiction), disclosed in a note at the bottom of each sheet. Replace with official data before release; `grep -rn "data contoh\|sample (dummy)" src/i18n` finds the note.
- File picking and drag and drop are covered by Playwright, not by hand in the browser pane (it cannot open a file chooser).
- The `≟` glyph falls back to a system font (IBM Plex Mono latin subset lacks it).

## Revision 2 (2026-10-19)
Inline code chips for paths, shortcuts and commands; Cmd/Ctrl + Enter runs the check (`kbd` hint next to the button, hidden on touch);
literal `\n` in a pasted key becomes real line breaks (`normalizePaste`, also quotes around it); language switch is an inline
link with a globe icon; legal sheets have a fixed title and Close button and complete dummy data instead of `[REAL DATA]`.

## Next Steps
1. Replace the `[REAL DATA]` legal text with the official text, and the hosting-log and contact lines.
2. Decide on hosting (HTTPS needed for WebCrypto) and push the branch.
