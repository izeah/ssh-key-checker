# Task Plan — Ssh Key Checker

> [!IMPORTANT]
> **PLANNING GATE FOR HEAVY TASKS — AI AGENT MUST READ THIS FIRST**
>
> Used for every task triaged as **HEAVY** (CLAUDE.md Rule 0: vague requirements, schema change, API contract change,
> auth/payment/PII/security-sensitive code, new dependency, >2 files or multi-layer, irreversible operation).
> Populate this file, then **STOP** and wait for the developer to explicitly type **`deal`**.
> **Do NOT write any code, create any other file, or run any mutating command until you receive `deal`.**
> LIGHT tasks skip this file but still run the Verification Pipeline (CLAUDE.md Rule 1).

---

## Current Task

**Task Title:** SSH key pair checker: a single client-side page that tells you whether a private key and a public key
are a pair

**Requested by:** Developer prompt (2026-10-19): one landing page, paste or upload (`.pem` and friends) a private key
and a public key, human error messages for a wrong format or a non-matching pair, Terms and Privacy as popups on the
same page, responsive, attractive and anti-slop (inspiration from 21st.dev), human copywriting, everything processed
in the browser only, battle-tested end to end in the browser pane on a local run.

**Status:** `AWAITING REVIEW` <!-- DRAFT → AWAITING REVIEW → APPROVED (deal) → IN PROGRESS → DONE -->

**Scope Size:** XL (≈9 files created, ≈16 modified, 11 deleted). Kept as one task because it is one deliverable; it
runs in 6 phases with a commit at each boundary so any phase can be reviewed or reverted on its own.

**Triage:** HEAVY. Security-sensitive input (private keys), new dependencies (fonts), file upload, removal of the
scaffold's auth layer, more than 2 files across layers, and `DESIGN.md` was not `APPROVED`.

---

## Clarifying Questions (if any)

> If any requirements are ambiguous or underspecified, list questions here and STOP.
> Do NOT proceed until the developer answers them.

Each question has a default. Typing `deal` accepts every default; answer only the ones you want different.

- [ ] **Q1. Remove the scaffold's login/dashboard/auth?** This product has no account and no backend, so `LoginPage`,
      `DashboardPage`, `src/lib/auth.js`, the mock API, `react-router` and `@tanstack/react-query` become dead code and
      attack surface. *Default: remove them.*
- [ ] **Q2. Baseline commit first?** The repo has no commit yet, so deleting scaffold files would be unrecoverable.
      *Default: commit the untouched scaffold on `master` as `chore: scaffold from vibe-gen`, then work on
      `feat/ssh-key-checker` with one commit per phase. Nothing is pushed.*
- [ ] **Q3. Legal text in the two popups.** `CLAUDE.md` says the agent never writes legal text (`[REAL DATA]` until
      you supply it). *Default: both dialogs are built and working. The Privacy dialog opens with a factual summary of
      what this page does with keys (each line is checked by an e2e test), and the legal body of both dialogs says
      `[REAL DATA]` until you paste your text. Alternative: you explicitly ask me to write a draft, marked as a draft.*
- [ ] **Q4. Passphrase-protected private keys.** Decrypting them needs bcrypt-pbkdf and AES in the browser (a crypto
      dependency or hand-written crypto) and asks users to type a passphrase into a web page. *Default: never ask for
      the passphrase. For an encrypted OpenSSH key, compare the public copy stored unencrypted inside the file and say
      honestly that the secret part was not tested; for encrypted PEM/PKCS#8, explain and give the `ssh-keygen -y`
      command.*
- [ ] **Q5. "Fill in a sample pair" button?** Lets a cautious visitor see the tool work without pasting a real key. The
      pair is generated fresh in the browser with WebCrypto on every click and never stored. *Default: include it
      (about 15 lines, reuses the fingerprint code).*
- [ ] **Q6. Search engines.** A Vite SPA cannot rank (meta tags render in JS). *Default: the page stays `noindex` as a
      tool. If it must rank, that is a separate Next/SvelteKit project.*
- [ ] **Q7. Product name.** The scaffold says "Ssh Key Checker". *Default: "SSH Key Checker" (SSH is an acronym) in the
      UI and `<title>`; the package name stays `ssh-key-checker`.*
- [ ] **Q8. Indonesian register.** *Default: casual "kamu" (the scaffold used "Anda"); English neutral.*
- [ ] **Q9. Fonts.** *Default: Instrument Sans + IBM Plex Mono, self-hosted through two `@fontsource` packages (the only
      new dependencies; see DESIGN.md → Typography for why). Alternative: name other faces.*
- [ ] **Q10. DESIGN.md.** Palette, type, motif, dials and copy voice are proposals (DESIGN.md, Status `DRAFT`). `deal`
      approves them and sets Status `APPROVED` with an ADR.

---

## Implementation Plan

### How the check works (client-side only)

1. **Read the private key** (`src/lib/ssh-key.js` → `readPrivateKey(text)`): detect the format by its armor, decode
   base64 strictly, parse it, and build a non-extractable WebCrypto `CryptoKey` (Ed25519, ECDSA P-256/384/521, RSA).
   - OpenSSH `openssh-key-v1`: SSH wire format reader (uint32, string, mpint, all bounds-checked). Checks the two
     check integers match and the public copy in the header equals the one in the private section. Imported as JWK;
     RSA `dp`/`dq` are computed with `BigInt`.
   - PEM PKCS#1 (`BEGIN RSA PRIVATE KEY`), SEC1 (`BEGIN EC PRIVATE KEY`): wrapped into PKCS#8 with a minimal DER
     reader/writer, then `importKey("pkcs8")`. PKCS#8 (`BEGIN PRIVATE KEY`): imported directly after reading its
     algorithm OID.
   - The public half is exported as JWK and re-encoded into the SSH wire blob.
2. **Read the public key** (`readPublicKey(text)`): one OpenSSH line (with or without comment, with or without an
   `authorized_keys` options prefix), RFC 4716 `BEGIN SSH2 PUBLIC KEY`, PEM `BEGIN PUBLIC KEY` (SPKI) and
   `BEGIN RSA PUBLIC KEY`. Rejects a line whose type label disagrees with the type inside the blob.
3. **Fingerprint** both: `SHA256:` + unpadded base64 of SHA-256 over the wire blob (`crypto.subtle.digest`), the same
   string `ssh-keygen -lf` prints. Unit tests compare it with real `ssh-keygen` output.
4. **Check the pair** (`checkPair(priv, pub)`): different type → `typeMismatch`; different fingerprint → `mismatch`;
   same fingerprint → sign 32 random bytes with the private key and verify with the public key → `match` or
   `damaged`. Encrypted OpenSSH key → `publicPartMatch` (honest caveat). Browser without Ed25519 in WebCrypto →
   `noEd25519`.
5. Every function returns `{ ok, ... }` or an error **key**, never throws to the UI and never puts key material in an
   error. Errors are i18n keys, so a message on screen follows a language switch.

No crypto library: WebCrypto (`crypto.subtle`, `getRandomValues`), `atob`, `TextDecoder` and `BigInt` cover it.
WebCrypto needs a secure context: `localhost` in development, HTTPS in production.

### Page structure (one route, `/`)

| Block | Content | Inspiration (21st.dev) |
|---|---|---|
| Top bar | "SSH Key Checker" as mono text (no logo), `LangToggle` + `ThemeToggle` | |
| Hero (left-aligned) | motif `id_ed25519 ≟ id_ed25519.pub`, H1, lede, the offline proof line | DevTool Landing Page: the product is the hero |
| Tool (focal point) | two panes, Private key and Public key: label, hint, mono textarea, "Choose file / or drop it here" row, live status line ("Read as ED25519, 256-bit") or the error with its fix. Side by side from 1024px with a `≟` seam between them, stacked below | File Upload (ReUI), Textarea with status line (ShadonSpace) |
| Actions | primary "Check the pair" (the one accent), "Clear both", "Fill in a sample pair" (Q5), "Swap them" shown only when the keys are in the wrong fields | |
| Result (live region) | idle explainer, checking, match (type, size, comment, fingerprint + copy button, `ssh-keygen -lf` note), public-part match, not a pair (both fingerprints with `≠`), type mismatch, damaged, weak-RSA note | Snippet: copyable `ssh-keygen` command |
| FAQ | 5 product-specific questions in native `<details>` | |
| Footer | one line on cookies/trackers, "Terms of use" and "Privacy policy" buttons | |
| Dialogs | native `<dialog>` (`showModal`): side sheet from 768px, bottom sheet below; Esc, close button and backdrop click close it; focus returns to the trigger | Sheet (ShadcnSpace) |
| Not found | any other path: one line and a link back to `/` | |

Upload details: `<input type="file">` without a restrictive `accept` (on macOS it would grey out `id_ed25519`, which has
no extension); the content decides, read with `file.text()`; 32 KB limit checked on `file.size` before reading;
binary content rejected; dropping two files at once puts each in the right field by content. Nothing is uploaded.

Backticks in dictionary strings render as `<code>` through a small splitter that returns React elements (no
`innerHTML`, no `dangerouslySetInnerHTML`).

### Files to Create

| File Path | Layer | Purpose |
|---|---|---|
| `src/lib/ssh-key.js` | lib | formats, SSH wire + minimal DER, fingerprint, `checkPair`, `samplePair` (Q5). Split into `src/lib/der.js` only if it passes ~400 lines |
| `src/lib/ssh-key.test.js` | test | unit, `ssh-keygen` cross-check, mutation fuzz |
| `src/pages/CheckerPage.jsx` | page | the single page: hero, tool, result, FAQ, footer, dialogs |
| `src/components/molecules/KeyField.jsx` | molecule | label, hint, textarea, file row, drop, status/error (used twice) |
| `src/components/organisms/PairResult.jsx` | organism | every result state, fingerprints, copy button |
| `src/components/organisms/LegalDialog.jsx` | organism | native `<dialog>` sheet for Terms and Privacy |
| `e2e/keys.mjs` | test helper | generates key fixtures with `ssh-keygen` (`execFileSync`, no shell) in a temp dir per run, deleted afterwards. No private key is ever committed |
| `e2e/checker.spec.js` | e2e | flows, errors, uploads, dialogs, keyboard, privacy and offline |
| `.claude/launch.json` | tooling | `preview` (build + `vite preview`, CSP active) and `dev` servers for the browser pane |

### Files to Modify

| File Path | Change Description |
|---|---|
| `src/main.jsx` | drop `QueryClientProvider` and `RouterProvider`; render `CheckerPage` on `/`, `NotFoundPage` elsewhere; import the fonts |
| `src/pages/NotFoundPage.jsx` | link back to `/` instead of `/dashboard` |
| `src/i18n/id.js`, `src/i18n/en.js` | replace login/dashboard/legal-page strings with the copy deck below |
| `src/lib/lang.js`, `src/lib/lang.test.js` | remove `loginError` and its test; `pageTitle` uses "SSH Key Checker" (Q7) |
| `src/styles/globals.css` | DESIGN.md tokens for both themes, type scale, fonts, layout, panes, seam, result, dialog, FAQ; keep the reduced-motion block and the toggles |
| `index.html` | keep `noindex`; `lang="id"` stays the pre-render default |
| `vite.shared.js` | remove the `/v1` proxy and `VITE_API_BASE_URL`; CSP becomes `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'`, `font-src 'self'`; try `require-trusted-types-for 'script'` and keep it only if the e2e run shows no violation |
| `nginx.conf` | the same CSP plus `frame-ancestors 'none'`; add `Cross-Origin-Opener-Policy: same-origin`; `Referrer-Policy: no-referrer` |
| `.env.example` | remove the API variables (nothing to configure) |
| `package.json`, `package-lock.json` | remove `react-router`, `@tanstack/react-query`; add the two font packages (exact versions) |
| `playwright.config.js` | remove the mock API server; wait on `/` |
| `e2e/screens.spec.js` | screens: checker empty, match, not a pair, field error, dialog open, not found; 375/768/1280, both themes, both languages |
| `e2e/lang.spec.js` | a switch translates in place and keeps both textareas and the result |
| `e2e/seo.spec.js` | `/` and a missing path say `noindex` |
| `DESIGN.md`, `docs/decisions.md`, `docs/architecture.md`, `docs/security.md`, `docs/testing.md`, `docs/progress.md`, `README.md` | Status `APPROVED` + ADRs (client-only WebCrypto, auth scaffold removed, fonts), client-only architecture, key-handling threat model, how to run the tests |

### Files to Delete (Q1)

`src/router.jsx`, `src/pages/LoginPage.jsx`, `src/pages/DashboardPage.jsx`, `src/pages/LegalPage.jsx`,
`src/lib/auth.js`, `src/lib/auth.test.js`, `src/lib/seo.js`, `src/lib/seo.test.js`, `e2e/auth.spec.js`,
`e2e/mock-api.mjs`, `chat_history.md` (describes a Go backend this project does not have; kept if you prefer).

### DB Schema Changes

None. No database, no backend.

### API Contracts

None. The page makes no request after it loads; the CSP forbids it.

### Business Rules & Validations

- [ ] Accepted private formats: OpenSSH, PEM PKCS#1 RSA, PEM SEC1 EC, PKCS#8. Accepted public formats: OpenSSH line
      (comment and `authorized_keys` options allowed), RFC 4716, PEM SPKI, PEM PKCS#1 RSA public.
- [ ] Key types: Ed25519, RSA (any size the browser accepts, weak-key note under 2048 bit), ECDSA P-256/P-384/P-521.
- [ ] Clear, specific refusals: DSA, FIDO security keys (`sk-…`), PuTTY `.ppk`, SSH certificates (`-cert-v01`),
      more than one key in a field, other curves.
- [ ] Input limit 32 KB per field and per file (a 16384-bit RSA OpenSSH key is about 12.5 KB). Binary files rejected.
- [ ] Whitespace, CRLF line endings, a UTF-8 BOM and stray indentation from copy-paste are tolerated.
- [ ] A public key in the private field (or the reverse) is detected and offers "Swap them".
- [ ] The private field is checked live as you paste (format and fingerprint only); the pair check runs on the button.
- [ ] Error text names the problem and the next step (see copy deck); never a raw exception, never key content.

### Dependencies (New Libraries)

| Library | Version | Reason |
|---|---|---|
| `@fontsource-variable/instrument-sans` | 5.3.0 (OFL-1.1) | self-hosted UI face, bundled by Vite, no font CDN |
| `@fontsource/ibm-plex-mono` | 5.3.0 (OFL-1.1) | self-hosted mono for keys and fingerprints |

Removed: `react-router`, `@tanstack/react-query`. No crypto, UI, icon or motion library.

### Copy deck (proposal, both languages)

Code spans in backticks render in mono. User data (a key comment) is shown as typed, never translated.

| Where | Bahasa Indonesia (kamu) | English |
|---|---|---|
| `<title>` | Cek pasangan SSH key · SSH Key Checker | Check an SSH key pair · SSH Key Checker |
| H1 | Cek apakah private key dan public key kamu benar-benar sepasang. | Check whether your private key and public key really are a pair. |
| Lede | Tempel isinya atau pilih filenya. Semua pengecekan berjalan di browser ini, jadi kunci kamu tidak dikirim ke mana pun. | Paste them in or choose the files. Every check runs in this browser, so your keys are not sent anywhere. |
| Proof line | Mau bukti? Matikan internet setelah halaman ini terbuka, lalu cek. Hasilnya tetap keluar. | Want proof? Turn off your internet after this page loads, then run the check. You still get an answer. |
| Private hint | Isi file seperti `~/.ssh/id_ed25519`, lengkap dari baris `-----BEGIN` sampai `-----END`. | The contents of a file like `~/.ssh/id_ed25519`, from the `-----BEGIN` line to the `-----END` line. |
| Public hint | Satu baris dari file `.pub`, diawali `ssh-ed25519`, `ssh-rsa`, atau `ecdsa-sha2-`. | One line from the `.pub` file, starting with `ssh-ed25519`, `ssh-rsa`, or `ecdsa-sha2-`. |
| File row | Pilih file · atau tarik ke sini | Choose file · or drop it here |
| Hidden folder tip | Folder `.ssh` tidak kelihatan? Di macOS, tekan Cmd + Shift + . (titik) di jendela pilih file. Di Windows, ketik `%USERPROFILE%\.ssh` di kolom alamat. | Can't see the `.ssh` folder? On macOS, press Cmd + Shift + . (period) in the file picker. On Windows, type `%USERPROFILE%\.ssh` in the address bar. |
| Status: read | Terbaca: ED25519, 256 bit, komentar `me@laptop` | Read as ED25519, 256-bit, comment `me@laptop` |
| Buttons | Cek pasangannya · Mengecek… · Kosongkan keduanya · Kosongkan · Isi dengan pasangan contoh · Tukar posisinya · Salin fingerprint · Tersalin | Check the pair · Checking… · Clear both · Clear · Fill in a sample pair · Swap them · Copy fingerprint · Copied |
| Sample note | Ini pasangan contoh yang baru dibuat di browser kamu, bukan kunci siapa pun. | This sample pair was just generated in your browser. It belongs to no one. |
| Result: idle | Jawabannya muncul di sini. Kami bandingkan fingerprint kedua kunci, lalu membuat tanda tangan dari data acak dengan private key dan memeriksanya dengan public key. | The answer shows up here. We compare the fingerprints of both keys, then sign random data with the private key and verify it with the public key. |
| Result: match | **Sepasang.** Public key ini milik private key kamu. Tanda tangan dari private key lolos verifikasi dengan public key. | **They're a pair.** This public key belongs to your private key. A signature made with the private key verified against the public key. |
| Fingerprint note | Nilai ini sama dengan yang dicetak `ssh-keygen -lf` dan yang tampil di halaman SSH keys GitHub. | This is the same value `ssh-keygen -lf` prints and GitHub shows on its SSH keys page. |
| Result: public part | **Bagian publiknya cocok.** Private key ini dikunci passphrase, dan kami sengaja tidak memintanya. Yang kami cek: public key yang tersimpan di dalam file private key sama persis dengan public key kamu. Untuk bukti penuh, jalankan `ssh-keygen -y -f <file private key>` di komputermu. | **The public part matches.** This private key is protected by a passphrase, and we don't ask for it on purpose. What we checked: the public key stored inside the private key file is identical to your public key. For full proof, run `ssh-keygen -y -f <private key file>` on your machine. |
| Result: not a pair | **Bukan pasangan.** Kedua kunci valid, tapi berasal dari pasangan yang berbeda. Biasanya file `.pub` tertukar dengan milik kunci lain. Coba file `.pub` yang namanya sama dengan file private key kamu. | **Not a pair.** Both keys are valid, but they come from different pairs. Usually the `.pub` file belongs to another key. Try the `.pub` file with the same name as your private key file. |
| Result: type mismatch | **Bukan pasangan.** Private key kamu bertipe RSA, sedangkan public key-nya ED25519. Kunci beda tipe tidak mungkin sepasang. | **Not a pair.** Your private key is RSA, but the public key is ED25519. Keys of different types can never be a pair. |
| Result: damaged | **Private key ini rusak.** Bagian publiknya cocok, tapi bagian rahasianya tidak bisa membuat tanda tangan yang valid. Ambil salinan baru dari sumber aslinya, misalnya backup atau password manager kamu. | **This private key is damaged.** Its public part matches, but its secret part can't produce a valid signature. Get a fresh copy from where it came from, such as your backup or password manager. |
| Result: blocked | Belum bisa dicek. Perbaiki dulu yang ditandai di atas. | Can't check yet. Fix what's marked above first. |
| Result: no Ed25519 | Browser ini belum bisa memverifikasi kunci ED25519. Perbarui browser kamu, lalu cek lagi. | This browser can't verify ED25519 keys yet. Update your browser, then check again. |
| Weak RSA note | Catatan: RSA 1024 bit sudah dianggap lemah. Kalau sempat, buat kunci baru dengan `ssh-keygen -t ed25519`. | Note: 1024-bit RSA is considered weak today. When you can, make a new key with `ssh-keygen -t ed25519`. |
| Private: empty | Tempel private key kamu dulu, atau pilih filenya. | Paste your private key first, or choose its file. |
| Private: not a key | Ini bukan private key SSH. Isinya harus diawali baris seperti `-----BEGIN OPENSSH PRIVATE KEY-----`. | This isn't an SSH private key. It should start with a line like `-----BEGIN OPENSSH PRIVATE KEY-----`. |
| Private: is public | Ini public key, bukan private key. Sepertinya posisinya tertukar. | This is a public key, not a private key. Looks like the two got swapped. |
| Private: truncated | Kuncinya terpotong: baris penutup `-----END …-----` tidak ada. Salin ulang seluruh isi file, dari baris pertama sampai terakhir. | The key is cut off: the closing `-----END …-----` line is missing. Copy the whole file again, first line to last. |
| Private: damaged text | Ada karakter yang rusak di tengah kunci, jadi isinya tidak bisa dibaca. Salin ulang dari file aslinya, jangan diketik manual. | Some characters in the middle of the key are damaged, so it can't be read. Copy it again from the original file instead of retyping it. |
| Private: inconsistent | Private key ini rusak: bagian-bagian di dalamnya tidak saling cocok. Ambil salinan baru dari sumber aslinya. | This private key is damaged: its parts don't agree with each other. Get a fresh copy from where it came from. |
| Private: PuTTY | Ini file PuTTY (`.ppk`). Buka di PuTTYgen, pilih Conversions, lalu Export OpenSSH key, dan tempel hasilnya di sini. | This is a PuTTY file (`.ppk`). Open it in PuTTYgen, choose Conversions, then Export OpenSSH key, and paste the result here. |
| Private: encrypted PEM | Private key ini dikunci passphrase dalam format yang tidak menyimpan salinan public key, jadi tidak bisa dicek tanpa passphrase. Jalankan `ssh-keygen -y -f <file>` di terminal untuk melihat public key-nya. | This private key is passphrase-protected in a format that keeps no copy of the public key, so it can't be checked without the passphrase. Run `ssh-keygen -y -f <file>` in a terminal to see its public key. |
| DSA (both) | Kunci DSA tidak didukung. OpenSSH sendiri sudah berhenti mendukungnya, jadi sebaiknya buat kunci baru dengan `ssh-keygen -t ed25519`. | DSA keys aren't supported. OpenSSH itself has dropped them, so make a new key with `ssh-keygen -t ed25519`. |
| Security key (both) | Ini kunci security key (FIDO), misalnya YubiKey. Bagian rahasianya ada di perangkat itu, bukan di file, jadi tidak bisa dicek di sini. | This is a hardware security key (FIDO), such as a YubiKey. Its secret lives on the device, not in the file, so it can't be checked here. |
| Unsupported type (both) | Tipe kunci ini belum didukung. Yang bisa dicek: ED25519, RSA, dan ECDSA (P-256, P-384, P-521). | This key type isn't supported. You can check ED25519, RSA, and ECDSA (P-256, P-384, P-521). |
| Browser refuses (both) | Format kuncinya benar, tapi browser ini menolak memakainya. Ini biasanya terjadi pada kunci RSA yang sangat pendek atau tidak standar. | The key format is fine, but this browser refuses to use it. That usually happens with very short or non-standard RSA keys. |
| Multiple keys (both) | Ada lebih dari satu kunci di sini. Tempel satu saja. | There's more than one key here. Paste just one. |
| Public: empty | Tempel public key kamu dulu, atau pilih file `.pub`-nya. | Paste your public key first, or choose its `.pub` file. |
| Public: not a key | Ini bukan public key SSH. Bentuknya satu baris: tipe kunci, spasi, lalu deretan karakter panjang yang biasanya diawali `AAAA`. | This isn't an SSH public key. It's one line: the key type, a space, then a long string that usually starts with `AAAA`. |
| Public: is private | Ini private key, bukan public key. Sepertinya posisinya tertukar. | This is a private key, not a public key. Looks like the two got swapped. |
| Public: damaged text | Deretan karakter kuncinya terpotong atau rusak. Salin ulang seluruh baris dari file `.pub`. | The key's long string is cut off or damaged. Copy the whole line from the `.pub` file again. |
| Public: label mismatch | Label di depan kunci (`ssh-rsa`) tidak sama dengan isinya (ED25519). Sepertinya baris ini sudah diedit manual. Salin ulang dari file `.pub`. | The label in front (`ssh-rsa`) doesn't match what's inside (ED25519). The line looks hand-edited. Copy it again from the `.pub` file. |
| Public: certificate | Ini sertifikat SSH (`-cert-v01`), bukan public key biasa. Pakai file `.pub` yang namanya tanpa `-cert`. | This is an SSH certificate (`-cert-v01`), not a plain public key. Use the `.pub` file without `-cert` in its name. |
| File: too big | File ini terlalu besar untuk sebuah kunci SSH (lebih dari 32 KB). Pastikan kamu memilih file yang benar. | This file is too big to be an SSH key (over 32 KB). Make sure you picked the right file. |
| File: not text | File ini bukan teks, jadi tidak mungkin kunci SSH. Pastikan kamu memilih file yang benar. | This file isn't text, so it can't be an SSH key. Make sure you picked the right file. |
| File: unreadable | File ini tidak bisa dibaca. Pilih lagi, atau tempel isinya langsung. | This file couldn't be read. Choose it again, or paste its contents instead. |
| Footer line | Tidak ada akun atau pelacak, dan cookie-nya hanya menyimpan pilihan bahasa dan tema kamu. | There are no accounts or trackers, and the only cookies keep your language and theme choice. |
| Footer buttons | Syarat penggunaan · Kebijakan privasi | Terms of use · Privacy policy |
| Dialog close | Tutup | Close |
| Not found | Halaman ini tidak ada. · Kembali ke pengecek kunci | This page doesn't exist. · Back to the key checker |

**FAQ** (each answers a real question about this tool; R-28):

1. *Apakah kuncinya dikirim ke server? / Are the keys sent to a server?* Tidak. Kode di halaman ini membaca dan
   mengecek kunci di browser kamu, dan aturan keamanan halaman (Content Security Policy) membuat browser menolak
   koneksi keluar seperti fetch, XHR, atau WebSocket. Buktikan sendiri: buka tab Network di DevTools, lalu tekan Cek
   pasangannya. Tidak ada request baru yang muncul.
2. *Amankah menempel private key produksi di sini? / Is it safe to paste a production private key here?* Untuk kunci
   yang membuka server penting, jalur paling aman tetap terminal kamu sendiri. Satu hal yang tidak bisa dikendalikan
   halaman mana pun adalah extension browser yang boleh membaca semua halaman. Kalau ragu, pakai jendela private tanpa
   extension, atau jalankan `ssh-keygen -y -f ~/.ssh/id_ed25519` lalu bandingkan hasilnya dengan isi file `.pub` kamu.
3. *Format apa saja yang bisa dicek? / Which formats can it check?* The accepted list from Business Rules, plus what
   is not supported (DSA, FIDO security keys, PuTTY `.ppk`, SSH certificates).
4. *Private key-nya dikunci passphrase. Bisa dicek? / My private key has a passphrase. Can it be checked?* Sebagian.
   File OpenSSH menyimpan salinan public key di bagian yang tidak terkunci, jadi kami bisa memastikan salinan itu sama
   dengan public key kamu. Kami sengaja tidak meminta passphrase, sehingga bagian rahasianya tidak ikut diuji. Untuk
   PEM atau PKCS#8 yang terkunci, salinan itu tidak ada, jadi pakai `ssh-keygen -y -f <file>`.
5. *Apa itu fingerprint SHA256? / What is a SHA256 fingerprint?* Ringkasan pendek dari public key: `SHA256:` diikuti
   43 karakter. GitHub, GitLab, dan `ssh-keygen -lf` menampilkan nilai yang sama, jadi kamu bisa mencocokkan kunci di
   laptop dengan kunci yang terdaftar di akun kamu tanpa membandingkan seluruh isinya.

**Privacy dialog, factual part** (each line is asserted by an e2e test): keys are read only by this page's code in
your browser; the CSP blocks outgoing connections; nothing goes to localStorage, sessionStorage, IndexedDB or cookies,
and a reload or "Clear both" removes the keys from the page; the only cookies are `lang` and `theme`. Then: hosting
access logs `[REAL DATA]`, and the legal body `[REAL DATA]` (Q3). Terms dialog: `[REAL DATA]` (Q3).

### Testing Plan

Unit (`npm test -- ssh-key`, Node 24 has the same WebCrypto):
- [ ] Fixtures from real `ssh-keygen` (OpenSSH 10.3 here), made per run in a temp dir: Ed25519; RSA 1024 (weak note),
      2048, 3072, 4096; ECDSA 256, 384, 521; PEM (`-m PEM`) RSA and EC; PKCS#8 (`-m PKCS8`); Ed25519 PKCS#8 from
      Node `crypto`; passphrase-protected OpenSSH and PEM; public keys as OpenSSH line, RFC 4716 (`-e`), SPKI
      (`-e -m PKCS8`), PKCS#1 (`-e -m PEM`).
- [ ] Our fingerprint equals `ssh-keygen -lf` for every fixture; our derived public key equals `ssh-keygen -y`.
- [ ] Every real pair is `match`; every cross pair is `mismatch` or `typeMismatch`; encrypted OpenSSH is
      `publicPartMatch`; encrypted PEM gives its error key.
- [ ] Each copy-deck error has a test input that produces exactly that key: empty, prose, swapped fields, missing END
      line, a damaged base64 character, PuTTY header, DSA and `sk-` lines (built byte by byte), certificate line,
      label/blob mismatch, two keys in one field, 33 KB input, CRLF + BOM + indentation (accepted).
- [ ] Damaged private: flipping a byte in the secret scalar gives `damaged`; changing a check integer gives
      `inconsistent`.
- [ ] Fuzz: 2,000 random byte flips, truncations and insertions over valid keys, plus random strings: every call
      resolves to a result object; none throws, hangs or leaks key text into an error.

E2E (`make test-e2e`, production build so the CSP is the real one):
- [ ] Paste flows: match, not a pair, type mismatch, public part match; each shows its text and fingerprints.
- [ ] Upload with `setInputFiles` (including a file without extension), drop with a `DataTransfer`, two files dropped
      at once land in the right fields, oversize and binary files refused with their messages.
- [ ] "Swap them", "Clear", "Clear both", "Fill in a sample pair", "Copy fingerprint".
- [ ] Errors sit next to their field, linked by `aria-describedby`, field marked `aria-invalid`; result announced in a
      live region.
- [ ] Dialogs: open from the footer, close by button, Esc and backdrop; focus returns to the trigger.
- [ ] Keyboard only: the whole flow with Tab, Enter and Space; visible focus everywhere.
- [ ] Privacy: zero network requests from the moment the page has loaded through every check; the CSP meta contains
      `connect-src 'none'`; no CSP violation in the console; after checks, `localStorage`, `sessionStorage`,
      IndexedDB and `document.cookie` hold nothing but `lang`/`theme` and no key text.
- [ ] Offline: `context.setOffline(true)` after load, the check still answers.
- [ ] Language switch keeps both textareas and translates the result in place; theme toggle and reload behave as
      before.
- [ ] `make ui-shots`: every state at 375, 768 and 1280 px, light and dark, both languages; no horizontal scroll; I open
      and look at the PNGs.

Manual, in the browser pane (as you asked): build + `vite preview` on `localhost:4173` through `.claude/launch.json`,
then click every control at phone and desktop widths in both themes and languages, paste the fixtures, upload them,
watch the console and the network panel, and report each element with what it did.

### Security Considerations

- [ ] Keys never leave the browser: no `fetch`/XHR/WebSocket in the code, and CSP `connect-src 'none'` +
      `form-action 'none'` enforce it even if code were injected; the form never submits natively.
- [ ] Nothing persists: keys live only in React state; no Web Storage, IndexedDB, cookies, URL, history or `console`.
      `CryptoKey`s are created non-extractable where the browser allows. JS cannot wipe strings from memory; the docs
      say so instead of claiming otherwise.
- [ ] Textareas: `spellcheck={false}` (Chrome's enhanced spell check sends text to Google), `autocomplete="off"`,
      `autocorrect="off"`, `autocapitalize="off"`, `data-gramm="false"` and `data-enable-grammarly="false"`.
- [ ] No `dangerouslySetInnerHTML`; key comments and file names render as text; no user input in `href`/`src`.
- [ ] Parsing is bounded: 32 KB cap before parsing, every length field bounds-checked, no regex with catastrophic
      backtracking on user input, no recursion on attacker-controlled depth.
- [ ] Honest limits stated in the UI: browser extensions, and the passphrase-key caveat (FAQ 2 and 4).
- [ ] Headers: CSP (above), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy:
      no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, HTTPS in production (WebCrypto
      needs a secure context).
- [ ] Test keys are generated per run in a temp dir and deleted; none is committed (`.gitignore` already ignores
      `*.pem`/`*.key`).
- [ ] `make sast`, `npm audit --omit=dev`, `/security-review` on the final diff.

---

## Execution Checklist

> Filled by AI during execution after `deal` is received.
> Check off each item as it is completed.

### Phase 0: Baseline
- [ ] Baseline commit of the untouched scaffold on `master` (Q2), then branch `feat/ssh-key-checker`
- [ ] `DESIGN.md` Status `APPROVED` + ADR in `docs/decisions.md`

### Phase 1: Key engine
- [ ] `e2e/keys.mjs` fixture generator
- [ ] `src/lib/ssh-key.js` (private, public, fingerprint, pair check, sample pair)
- [ ] `src/lib/ssh-key.test.js` green, including the `ssh-keygen` cross-check and fuzz
- [ ] Commit

### Phase 2: Remove the scaffold auth, harden, fonts
- [ ] Delete the files in "Files to Delete"; update `main.jsx`, `lang.js`, `lang.test.js`, `NotFoundPage.jsx`
- [ ] `package.json`: remove 2 packages, add 2 font packages; `npm install`
- [ ] CSP in `vite.shared.js` and `nginx.conf`; `.env.example`; `playwright.config.js`
- [ ] `npm run lint && npm test` green; commit

### Phase 3: UI
- [ ] Tokens, themes and type in `globals.css`
- [ ] `KeyField`, `PairResult`, `LegalDialog`, `CheckerPage`
- [ ] Copy deck in `src/i18n/id.js` and `src/i18n/en.js`
- [ ] Commit

### Phase 4: End-to-end
- [ ] `e2e/checker.spec.js`, updated `screens`, `lang`, `seo` specs; `make test-e2e` green
- [ ] `make ui-shots`, open and look at every PNG
- [ ] Commit

### Phase 5: Verification Pipeline (CLAUDE.md Rule 1)
- [ ] `npm run lint && npm test`
- [ ] `/ponytail-review`, apply the cuts allowed by Rule 1.1, re-run lint and tests
- [ ] `make sast` clean; `npm audit --omit=dev`
- [ ] Manual click-through in the browser pane (both themes, both languages, 375 and 1280 px), console and network
      checked
- [ ] antislop Delivery Gate + app-kind checklist, PASS/FAIL per item with evidence
- [ ] `/security-review`
- [ ] Review `git diff`

### Phase 6: Docs & Commit
- [ ] `docs/architecture.md`, `docs/security.md`, `docs/testing.md`, `README.md`, ADRs
- [ ] Archive this task to `docs/progress.md`, reset this file
- [ ] Commit (no push)

---

> [!NOTE]
> After all phases are complete, archive this task summary to `docs/progress.md`
> and reset this file for the next task.
