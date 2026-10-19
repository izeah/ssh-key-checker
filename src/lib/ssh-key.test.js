import { execFileSync } from "node:child_process";
import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { makeFixtures } from "../../e2e/keys.mjs";
import {
  checkPair,
  normalizePaste,
  readPrivateKey,
  readPublicKey,
  samplePair,
} from "./ssh-key.js";

let fx;
beforeAll(() => {
  fx = makeFixtures();
}, 120_000);
afterAll(() => fx?.cleanup());

const plain = () =>
  Object.entries(fx.keys).filter(([n, k]) => k.public && !/Locked$/.test(n));

async function pair(priv, pub) {
  const a = await readPrivateKey(priv);
  const b = await readPublicKey(pub);
  expect(a.ok, `private: ${a.error}`).toBe(true);
  expect(b.ok, `public: ${b.error}`).toBe(true);
  return checkPair(a.key, b.key);
}

describe("real ssh-keygen keys", () => {
  test("every key pair is a match and the fingerprint is the one ssh-keygen prints", async () => {
    for (const [name, k] of plain()) {
      const r = await pair(k.private, k.public);
      expect(r.status, name).toBe("match");
      if (k.fingerprint) expect(r.publicFingerprint, name).toBe(k.fingerprint);
      expect(r.privateFingerprint, name).toBe(r.publicFingerprint);
    }
  }, 120_000);

  test("other public formats give the same fingerprint", async () => {
    for (const [name, k] of plain()) {
      for (const form of ["rfc4716", "spki", "pkcs1"]) {
        if (!k[form]) continue;
        const r = await readPublicKey(k[form]);
        expect(r.ok, `${name} ${form}: ${r.error}`).toBe(true);
        expect(r.key.fingerprint, `${name} ${form}`).toBe(k.fingerprint);
      }
    }
  });

  test("a key with a different pair is never a match", async () => {
    const keys = plain();
    for (const [a, ka] of keys) {
      for (const [b, kb] of keys) {
        if (a === b) continue;
        const r = await pair(ka.private, kb.public);
        expect(["mismatch", "typeMismatch"], `${a} x ${b}`).toContain(r.status);
      }
    }
  }, 120_000);

  test("RSA 1024 is a match and flagged weak", async () => {
    const r = await pair(fx.keys.rsa1024.private, fx.keys.rsa1024.public);
    expect(r).toMatchObject({ status: "match", weakRsa: true, bits: 1024 });
    expect(
      (await pair(fx.keys.rsa2048.private, fx.keys.rsa2048.public)).weakRsa,
    ).toBe(false);
  });

  test("type and size are reported", async () => {
    const r = await pair(fx.keys.ecdsa384.private, fx.keys.ecdsa384.public);
    expect(r).toMatchObject({
      publicType: "ECDSA P-384",
      bits: 384,
      comment: "ecdsa384@test",
    });
  });

  test("a passphrase-protected OpenSSH key only proves its public part", async () => {
    const k = fx.keys.edLocked;
    const r = await pair(k.private, k.public);
    expect(r.status).toBe("publicPartMatch");
    const other = await pair(k.private, fx.keys.ed25519.public);
    expect(other.status).toBe("mismatch");
  });

  test("a passphrase-protected PEM key says so", async () => {
    const r = await readPrivateKey(fx.keys.rsaPemLocked.private);
    expect(r).toEqual({ ok: false, error: "encryptedPem" });
  });

  test("Ed25519 PKCS#8 from Node reads and matches its SPKI and its OpenSSH line", async () => {
    const k = fx.keys.edPkcs8;
    expect((await pair(k.private, k.spki)).status).toBe("match");
    if (k.public)
      expect((await pair(k.private, k.public)).status).toBe("match");
  });

  test("CRLF, a BOM and copy-paste indentation are tolerated", async () => {
    const k = fx.keys.ed25519;
    const mangled = `﻿${k.private
      .split("\n")
      .map((l) => `   ${l}`)
      .join("\r\n")}`;
    expect((await pair(mangled, `  ${k.public.trim()}  \r\n`)).status).toBe(
      "match",
    );
  });

  test("an authorized_keys options prefix is skipped", async () => {
    const k = fx.keys.ed25519;
    const r = await pair(k.private, `no-pty,command="/bin/true" ${k.public}`);
    expect(r.status).toBe("match");
  });

  test("a key made by samplePair is accepted by ssh-keygen itself", async () => {
    const s = await samplePair();
    expect(s.ok).toBe(true);
    expect((await pair(s.privateText, s.publicText)).status).toBe("match");
    const file = join(fx.dir, "sample");
    writeFileSync(file, s.privateText);
    chmodSync(file, 0o600);
    const out = execFileSync("ssh-keygen", ["-y", "-f", file], {
      encoding: "utf8",
    });
    expect(out.split(" ")[1]).toBe(s.publicText.split(" ")[1]);
  });
});

// Flips one byte of the secret scalar of an Ed25519 OpenSSH key and rewrites the file.
function corruptEdSecret(text, pubLine) {
  const body = text
    .split("\n")
    .filter((l) => l && !l.startsWith("-----"))
    .join("");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const pub = Uint8Array.from(atob(pubLine.split(" ")[1]), (c) =>
    c.charCodeAt(0),
  ).slice(-32);
  const at = [];
  for (let i = 0; i + 32 <= der.length; i++)
    if (der.subarray(i, i + 32).every((b, j) => b === pub[j])) at.push(i);
  der[at[2] - 32] ^= 0xff; // the seed sits right before the public copy at the tail of the secret
  const b64 = btoa(String.fromCharCode(...der))
    .match(/.{1,70}/g)
    .join("\n");
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

describe("error keys", () => {
  const ed = () => fx.keys.ed25519;
  const priv = async (t) => (await readPrivateKey(t)).error;
  const pub = async (t) => (await readPublicKey(t)).error;
  const wire = (...parts) =>
    parts.map((p) => String.fromCharCode(0, 0, 0, p.length) + p).join("");
  const line = (label, blobText) => `${label} ${btoa(blobText)} x@y`;

  test("private field", async () => {
    expect(await priv("")).toBe("privateEmpty");
    expect(await priv("  \n \n")).toBe("privateEmpty");
    expect(await priv("hello world")).toBe("privateNotKey");
    expect(
      await priv(
        "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----",
      ),
    ).toBe("privateNotKey");
    expect(await priv(ed().public)).toBe("privateIsPublic");
    expect(
      await priv("-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----"),
    ).toBe("privateIsPublic");
    const cut = ed().private.split("\n").slice(0, -2).join("\n");
    expect(await priv(cut)).toBe("privateTruncated");
    const lines = ed().private.split("\n");
    lines[2] = `${lines[2].slice(0, 10)}!${lines[2].slice(11)}`;
    expect(await priv(lines.join("\n"))).toBe("privateDamaged");
    expect(
      await priv("PuTTY-User-Key-File-3: ssh-ed25519\nEncryption: none"),
    ).toBe("putty");
    expect(
      await priv(
        "-----BEGIN DSA PRIVATE KEY-----\nAAAA\n-----END DSA PRIVATE KEY-----",
      ),
    ).toBe("dsa");
    expect(await priv(ed().private + ed().private)).toBe("multipleKeys");
    expect(await priv("x".repeat(40_000))).toBe("tooBig");
  });

  test("private field: a damaged or inconsistent key", async () => {
    const k = ed();
    const body = k.private
      .split("\n")
      .filter((l) => l && !l.startsWith("-----"))
      .join("");
    const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    const header =
      15 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + (4 + 4 + 4 + 11 + 4 + 32) + 4; // up to the check ints
    der[header + 3] ^= 1;
    const b64 = btoa(String.fromCharCode(...der))
      .match(/.{1,70}/g)
      .join("\n");
    const text = `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64}\n-----END OPENSSH PRIVATE KEY-----`;
    expect(await priv(text)).toBe("privateInconsistent");

    const broken = corruptEdSecret(k.private, k.public);
    const read = await readPrivateKey(broken);
    if (read.ok) {
      const r = await checkPair(read.key, (await readPublicKey(k.public)).key);
      expect(r.status).toBe("damaged");
    } else {
      expect(read.error).toBe("privateInconsistent");
    }
  });

  test("public field", async () => {
    expect(await pub("")).toBe("publicEmpty");
    expect(await pub("hello world")).toBe("publicNotKey");
    expect(await pub("ssh-keygen -t ed25519")).toBe("publicNotKey");
    expect(await pub(ed().private)).toBe("publicIsPrivate");
    const [label, b64] = ed().public.split(" ");
    expect(await pub(`${label} ${b64.slice(0, 20)}`)).toBe("publicDamaged");
    expect(await pub(`${label} ${b64.slice(0, 10)}!${b64.slice(11)}`)).toBe(
      "publicDamaged",
    );
    expect(await pub(`ssh-rsa ${b64}`)).toBe("labelMismatch");
    expect(await pub(ed().public + ed().public)).toBe("multipleKeys");
    expect(await pub(line("ssh-dss", wire("ssh-dss")))).toBe("dsa");
    expect(
      await pub(
        line("sk-ssh-ed25519@openssh.com", wire("sk-ssh-ed25519@openssh.com")),
      ),
    ).toBe("securityKey");
    expect(
      await pub(
        line(
          "ssh-ed25519-cert-v01@openssh.com",
          wire("ssh-ed25519-cert-v01@openssh.com"),
        ),
      ),
    ).toBe("certificate");
    expect(
      await pub(line("ecdsa-sha2-nistp192", wire("ecdsa-sha2-nistp192"))),
    ).toBe("unsupportedType");
    // A curve name is looked up from key text: names on Object.prototype must not resolve.
    for (const name of ["__proto__", "constructor", "toString"])
      expect(["unsupportedType", "publicNotKey"]).toContain(
        await pub(line(`ecdsa-sha2-${name}`, wire(`ecdsa-sha2-${name}`))),
      );
    expect(await pub("y".repeat(40_000))).toBe("tooBig");
  });
});

// Mutation fuzz: whatever the input, the readers resolve to a result and never throw, hang or
// echo key text back.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("fuzz: 2000 mutated inputs never throw and errors are plain keys", async () => {
  const rand = rng(7);
  const names = [
    "ed25519",
    "rsa2048",
    "ecdsa256",
    "ecdsa521",
    "rsaPem",
    "ecPem",
    "edLocked",
    "rsa1024",
  ];
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const mutate = (s) => {
    const i = Math.floor(rand() * s.length);
    switch (Math.floor(rand() * 5)) {
      case 0:
        return (
          s.slice(0, i) +
          String.fromCharCode(33 + Math.floor(rand() * 90)) +
          s.slice(i + 1)
        );
      case 1:
        return s.slice(0, i);
      case 2:
        return s.slice(0, i) + s.slice(i + 1 + Math.floor(rand() * 20));
      case 3:
        return (
          s.slice(0, i) +
          pick(["\n", " ", "=", "-----", "\u0000", "é"]) +
          s.slice(i)
        );
      default:
        return s.slice(i);
    }
  };
  for (let n = 0; n < 2000; n++) {
    const k = fx.keys[pick(names)];
    const inputs = [mutate(k.private), mutate(k.public)];
    if (n % 50 === 0)
      inputs.push(
        Array.from({ length: 300 }, () =>
          String.fromCharCode(rand() * 65536),
        ).join(""),
      );
    const [a, b] = await Promise.all([
      readPrivateKey(inputs[0]),
      readPublicKey(inputs[1]),
    ]);
    for (const r of [a, b]) {
      expect(typeof r.ok).toBe("boolean");
      if (!r.ok) expect(r.error).toMatch(/^[a-zA-Z0-9]+$/);
    }
    if (a.ok && b.ok)
      expect([
        "match",
        "publicPartMatch",
        "mismatch",
        "typeMismatch",
        "damaged",
        "refused",
        "noEd25519",
      ]).toContain((await checkPair(a.key, b.key)).status);
  }
}, 120_000);

describe("pasted text with literal \\n", () => {
  test("becomes real line breaks, quotes around it are dropped", () => {
    expect(normalizePaste("a\\nb\\r\\nc")).toBe("a\nb\nc");
    expect(normalizePaste('"a\\nb"')).toBe("a\nb");
    expect(normalizePaste("'a\\nb'")).toBe("a\nb");
  });
  test("leaves everything else alone", () => {
    for (const t of ["a\nb with \\n inside", "no escapes", "", "  spaced  "])
      expect(normalizePaste(t)).toBe(t);
  });
  test("a key written with literal \\n is read as that key", async () => {
    const k = fx.keys.ed25519;
    const flat = k.private.trim().split("\n").join("\\n");
    expect(flat).not.toContain("\n");
    const r = await pair(`"${flat}"`, k.public.trim());
    expect(r.status).toBe("match");
    expect((await pair(flat, `${k.public.trim()}\\n`)).status).toBe("match");
  });
});
