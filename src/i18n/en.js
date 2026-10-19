// English UI strings. id must have the same keys (src/lib/lang.test enforces it).
// Backticks mark code: <Rich> renders them as <code>. Key comments are user data and never live here.
export const en = {
  langName: "English",
  langNav: "Language",
  theme: {
    dark: "Dark mode",
  },
  meta: {
    title: "Check an SSH key pair",
  },
  hero: {
    title: "Check whether your private key and public key really are a pair.",
    lede: "Paste them in or choose the files. Every check runs in this browser, so your keys are not sent anywhere.",
    proof:
      "Want proof? Turn off your internet after this page loads, then run the check. You still get an answer.",
  },
  fields: {
    private: {
      label: "Private key",
      hint: "The contents of a file like `~/.ssh/id_ed25519`, from the `-----BEGIN` line to the `-----END` line.",
    },
    public: {
      label: "Public key",
      hint: "One line from the `.pub` file, starting with `ssh-ed25519`, `ssh-rsa`, or `ecdsa-sha2-`.",
    },
  },
  file: {
    choose: "Choose file",
    drop: "or drop it here",
    dropping: "Drop the file here",
    clear: "Clear",
    tip: "Can't see the `.ssh` folder? On macOS, press `Cmd + Shift + .` (period) in the file picker. On Windows, type `%USERPROFILE%\\.ssh` in the address bar.",
  },
  status: {
    read: (type, bits) => `Read as ${type}, ${bits}-bit`,
    comment: ", comment",
    locked: "Protected by a passphrase, so only its public part was read.",
  },
  actions: {
    check: "Check the pair",
    checking: "Checking…",
    clearBoth: "Clear both",
    sample: "Fill in a sample pair",
    swap: "Swap them",
  },
  sample: {
    note: "This sample pair was just generated in your browser. It belongs to no one.",
  },
  result: {
    title: "Result",
    idle: "The answer shows up here. We compare the fingerprints of both keys, then sign random data with the private key and verify it with the public key.",
    blocked: "Can't check yet. Fix what's marked above first.",
    type: "Type",
    comment: "Comment",
    fingerprint: "Fingerprint",
    privateFingerprint: "Private key fingerprint",
    publicFingerprint: "Public key fingerprint",
    copy: "Copy fingerprint",
    copied: "Copied",
    copyFailed: "Could not copy. Select the text and copy it by hand.",
    match: {
      title: "They're a pair.",
      body: "This public key belongs to your private key. A signature made with the private key verified against the public key.",
      note: "This is the same value `ssh-keygen -lf` prints and GitHub shows on its SSH keys page.",
    },
    publicPart: {
      title: "The public part matches.",
      body: "This private key is protected by a passphrase, and we don't ask for it on purpose. What we checked: the public key stored inside the private key file is identical to your public key. For full proof, run `ssh-keygen -y -f <private key file>` on your machine.",
    },
    mismatch: {
      title: "Not a pair.",
      body: "Both keys are valid, but they come from different pairs. Usually the `.pub` file belongs to another key. Try the `.pub` file with the same name as your private key file.",
    },
    typeMismatch: {
      title: "Not a pair.",
      body: (priv, pub) =>
        `Your private key is ${priv}, but the public key is ${pub}. Keys of different types can never be a pair.`,
    },
    damaged: {
      title: "This private key is damaged.",
      body: "Its public part matches, but its secret part can't produce a valid signature. Get a fresh copy from where it came from, such as your backup or password manager.",
    },
    noEd25519: {
      title: "Can't check yet.",
      body: "This browser can't verify ED25519 keys yet. Update your browser, then check again.",
    },
    refused: {
      title: "Can't check yet.",
      body: "The key format is fine, but this browser refuses to use it. That usually happens with very short or non-standard RSA keys.",
    },
    weakRsa:
      "Note: 1024-bit RSA is considered weak today. When you can, make a new key with `ssh-keygen -t ed25519`.",
  },
  errors: {
    privateEmpty: "Paste your private key first, or choose its file.",
    privateNotKey:
      "This isn't an SSH private key. It should start with a line like `-----BEGIN OPENSSH PRIVATE KEY-----`.",
    privateIsPublic:
      "This is a public key, not a private key. Looks like the two got swapped.",
    privateTruncated:
      "The key is cut off: the closing `-----END …-----` line is missing. Copy the whole file again, first line to last.",
    privateDamaged:
      "Some characters in the middle of the key are damaged, so it can't be read. Copy it again from the original file instead of retyping it.",
    privateInconsistent:
      "This private key is damaged: its parts don't agree with each other. Get a fresh copy from where it came from.",
    putty:
      "This is a PuTTY file (`.ppk`). Open it in PuTTYgen, choose Conversions, then Export OpenSSH key, and paste the result here.",
    encryptedPem:
      "This private key is passphrase-protected in a format that keeps no copy of the public key, so it can't be checked without the passphrase. Run `ssh-keygen -y -f <file>` in a terminal to see its public key.",
    dsa: "DSA keys aren't supported. OpenSSH itself has dropped them, so make a new key with `ssh-keygen -t ed25519`.",
    securityKey:
      "This is a hardware security key (FIDO), such as a YubiKey. Its secret lives on the device, not in the file, so it can't be checked here.",
    unsupportedType:
      "This key type isn't supported. You can check ED25519, RSA, and ECDSA (P-256, P-384, P-521).",
    refused:
      "The key format is fine, but this browser refuses to use it. That usually happens with very short or non-standard RSA keys.",
    noEd25519:
      "This browser can't use ED25519 keys yet. Update your browser, then try again.",
    multipleKeys: "There's more than one key here. Paste just one.",
    publicEmpty: "Paste your public key first, or choose its `.pub` file.",
    publicNotKey:
      "This isn't an SSH public key. It's one line: the key type, a space, then a long string that usually starts with `AAAA`.",
    publicIsPrivate:
      "This is a private key, not a public key. Looks like the two got swapped.",
    publicDamaged:
      "The key's long string is cut off or damaged. Copy the whole line from the `.pub` file again.",
    labelMismatch:
      "The label in front doesn't match what's inside the key. The line looks hand-edited. Copy it again from the `.pub` file.",
    certificate:
      "This is an SSH certificate (`-cert-v01`), not a plain public key. Use the `.pub` file without `-cert` in its name.",
    tooBig:
      "This is too big to be an SSH key (over 32 KB). Make sure you picked the right file.",
    notText:
      "This file isn't text, so it can't be an SSH key. Make sure you picked the right file.",
    fileUnreadable:
      "This file couldn't be read. Choose it again, or paste its contents instead.",
  },
  faq: {
    title: "Questions people ask",
    items: [
      {
        q: "Are the keys sent to a server?",
        a: "No. The code on this page reads and checks the keys in your browser, and the page's security policy (Content Security Policy) makes the browser refuse outgoing connections such as `fetch`, `XHR`, or `WebSocket`. Check it yourself: open the `Network` tab in DevTools, then press Check the pair (or `Cmd + Enter`). No new request appears.",
      },
      {
        q: "Is it safe to paste a production private key here?",
        a: "For a key that opens an important server, your own terminal is still the safest route. One thing no web page can control is a browser extension that may read every page. If in doubt, use a private window with no extensions, or run `ssh-keygen -y -f ~/.ssh/id_ed25519` and compare the output with the contents of your `.pub` file.",
      },
      {
        q: "Which formats can it check?",
        a: "Private keys: OpenSSH, PEM (RSA and EC), and PKCS#8. Public keys: a single OpenSSH line (a comment is fine), RFC 4716, PEM, and PKCS#1. Key types: ED25519, RSA, and ECDSA (P-256, P-384, P-521). Not supported: DSA, FIDO security keys, PuTTY `.ppk` files, and SSH certificates.",
      },
      {
        q: "My private key has a passphrase. Can it be checked?",
        a: "Partly. An OpenSSH file keeps a copy of the public key in an unlocked section, so we can confirm that copy matches your public key. We don't ask for the passphrase on purpose, so the secret part isn't tested. For a locked PEM or PKCS#8 file there is no such copy, so use `ssh-keygen -y -f <file>`.",
      },
      {
        q: "What is a SHA256 fingerprint?",
        a: "A short summary of a public key: `SHA256:` followed by 43 characters. GitHub, GitLab, and `ssh-keygen -lf` show the same value, so you can match the key on your laptop with the one registered on your account without comparing the whole thing.",
      },
    ],
  },
  footer: {
    line: "There are no accounts or trackers, and the only cookies keep your language and theme choice.",
    terms: "Terms of use",
    privacy: "Privacy policy",
  },
  legal: {
    close: "Close",
    version: "Version 1.0 · Effective 19 October 2026",
    terms: {
      title: "Terms of use",
      sections: [
        {
          h: "1. Acceptance",
          p: [
            'By opening or using `ssh-key-checker.izeah.my.id` (the "service"), you agree to the terms below. If you don\'t agree, stop using it.',
          ],
        },
        {
          h: "2. What this service does",
          p: [
            "SSH Key Checker compares a private key with a public key and tells you whether they are a pair. Every check runs in your browser.",
          ],
        },
        {
          h: "3. Your responsibility for your keys",
          p: [
            "You decide which keys to paste here. For a key that opens an important system, consider checking it in your own terminal with `ssh-keygen`.",
            "You are responsible for the security of the device and browser you use, including the extensions installed in it.",
          ],
        },
        {
          h: "4. Prohibited use",
          p: [
            "Don't use this service to check keys that belong to someone else without their permission, and don't try to disrupt or damage it.",
          ],
        },
        {
          h: "5. No warranty",
          p: [
            "The service is provided as is. A result is an aid, not a guarantee that your systems are secure.",
          ],
        },
        {
          h: "6. Limitation of liability",
          p: [
            "To the extent the law allows, the provider is not liable for losses arising from using, or being unable to use, this service, except for gross negligence or intentional misconduct by the provider.",
          ],
        },
        {
          h: "7. Changes to the terms",
          p: [
            "These terms may change. Material changes get a new effective date at the top of this document, and using the service afterwards means you accept them.",
          ],
        },
        {
          h: "8. Governing law and contact",
          p: [
            "These terms are governed by the laws of the Republic of Indonesia. Disputes are first settled by discussion and, failing that, by the competent district court in Indonesia.",
            "Provider: Faiz Mohammad Hafidza, Indonesia. Contact: `hello@izeah.my.id`.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      sections: [
        {
          h: "1. Summary",
          p: [
            "This page reads keys in your browser. None of our servers receives them.",
          ],
        },
        {
          h: "2. Data processed",
          p: [
            "The contents of the private key and public key you paste or choose. This data exists only in the browser's memory while the page is open. Keys are not sent, not logged, and never seen by us.",
          ],
        },
        {
          h: "3. Purpose",
          p: [
            "One only: checking whether the two keys are a pair, at your request when you press the button. The data is not used for anything else.",
          ],
        },
        {
          h: "4. Storage and deletion",
          p: [
            "This page uses no `localStorage`, `sessionStorage`, `IndexedDB`, or cookie for keys. The contents of both fields disappear when you press Clear, reload the page, or close the tab.",
          ],
        },
        {
          h: "5. Cookies",
          p: [
            "Only two functional cookies, `lang` (language) and `theme` (theme), valid for one year. They hold no personal data. There are no advertising, analytics, or tracking cookies.",
          ],
        },
        {
          h: "6. Third parties",
          p: [
            "This page loads no scripts, fonts, or services from third parties, and we run no analytics or trackers. The service is delivered through Vercel, which may record standard access data such as IP address and visit time in its server logs, under Vercel's own privacy policy.",
          ],
        },
        {
          h: "7. Security",
          p: [
            "The page's security policy (Content Security Policy) makes the browser refuse outgoing connections from this page, and the page is served over HTTPS. The limit: a browser extension that may read every page can still see what you paste.",
          ],
        },
        {
          h: "8. Your rights and contact",
          p: [
            "Because we keep no personal data about you, there is nothing on our side to access or delete. Privacy questions can be sent to `hello@izeah.my.id`.",
          ],
        },
        {
          h: "9. Changes to this policy",
          p: [
            "This policy may change. Material changes get a new effective date at the top of this document.",
          ],
        },
      ],
    },
  },
  notFound: {
    title: "This page doesn't exist.",
    home: "Back to the key checker",
  },
};
