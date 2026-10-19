// Reads SSH private and public keys and checks that they are a pair. Browser only: WebCrypto,
// BigInt and atob, no dependency and no network. Every reader resolves to { ok, ... } and never
// throws or puts key text in an error: an error is a key of the i18n `errors` dictionary.

export const MAX_CHARS = 32768; // a 16384-bit RSA key in OpenSSH format is about 12.5 KB

class Bad extends Error {}
const bad = (key) => {
  throw new Bad(key);
};

const enc = new TextEncoder();
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

function toB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
const toB64u = (bytes) =>
  toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromB64(text, url = false) {
  let s = text.replace(/\s+/g, "");
  if (url) s = s.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 === 1) bad("damaged");
  try {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  } catch {
    return bad("damaged");
  }
}

// Big-endian integers: SSH mpint and DER INTEGER both carry a sign byte we drop.
const unsigned = (b) => {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.subarray(i);
};
const bitLength = (b) => {
  const u = unsigned(b);
  return (u.length - 1) * 8 + (32 - Math.clz32(u[0]));
};
const big = (b) => BigInt(`0x${hex(b) || "0"}`);
const fromBig = (v) => {
  const h = v.toString(16);
  return Uint8Array.from((h.length % 2 ? `0${h}` : h).match(/../g), (x) =>
    Number.parseInt(x, 16),
  );
};

// ---- SSH wire format -------------------------------------------------------

class Reader {
  constructor(bytes) {
    this.b = bytes;
    this.p = 0;
  }
  get left() {
    return this.b.length - this.p;
  }
  take(n) {
    if (n > this.left) bad("damaged");
    const out = this.b.subarray(this.p, this.p + n);
    this.p += n;
    return out;
  }
  u32() {
    const t = this.take(4);
    return t[0] * 2 ** 24 + (t[1] << 16) + (t[2] << 8) + t[3];
  }
  str() {
    return this.take(this.u32());
  }
  text() {
    return new TextDecoder().decode(this.str());
  }
}

const u32b = (n) =>
  Uint8Array.of(n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const sshStr = (b) => cat(u32b(b.length), b);
const wireStr = (s) => sshStr(enc.encode(s));
const mpint = (b) => {
  const u = unsigned(b);
  return sshStr(u[0] & 0x80 ? cat(Uint8Array.of(0), u) : u);
};

const CURVES = {
  nistp256: { crv: "P-256", size: 32, bits: 256, oid: "2a8648ce3d030107" },
  nistp384: { crv: "P-384", size: 48, bits: 384, oid: "2b81040022" },
  nistp521: { crv: "P-521", size: 66, bits: 521, oid: "2b81040023" },
};
const EC_BY_POINT_LENGTH = { 65: "nistp256", 97: "nistp384", 133: "nistp521" };
const rsaBlob = (n, e) => cat(wireStr("ssh-rsa"), mpint(e), mpint(n));
const edBlob = (k) => cat(wireStr("ssh-ed25519"), sshStr(k));
const ecBlob = (curve, q) =>
  cat(wireStr(`ecdsa-sha2-${curve}`), wireStr(curve), sshStr(q));

// What an unsupported key label is called to the user.
function unsupported(label) {
  if (label.includes("-cert-v01")) return bad("certificate");
  if (label === "ssh-dss") return bad("dsa");
  if (label.startsWith("sk-")) return bad("securityKey");
  return bad("unsupportedType");
}

// Public half in SSH wire format -> what the rest of the code needs.
function parseBlob(blob) {
  const r = new Reader(blob);
  const label = r.text();
  let info;
  if (label === "ssh-ed25519") {
    const k = r.str();
    if (k.length !== 32) bad("damaged");
    info = {
      kind: "ed25519",
      bits: 256,
      typeLabel: "ED25519",
      jwk: { kty: "OKP", crv: "Ed25519", x: toB64u(k) },
    };
  } else if (label === "ssh-rsa") {
    const e = unsigned(r.str());
    const n = unsigned(r.str());
    if (n.length === 1 && n[0] === 0) bad("damaged");
    info = {
      kind: "rsa",
      bits: bitLength(n),
      typeLabel: "RSA",
      jwk: { kty: "RSA", n: toB64u(n), e: toB64u(e) },
    };
  } else if (label.startsWith("ecdsa-sha2-")) {
    const name = label.slice("ecdsa-sha2-".length);
    const c = CURVES[name];
    if (!c) return unsupported(label);
    if (r.text() !== name) bad("damaged");
    const q = r.str();
    if (q.length !== 1 + 2 * c.size || q[0] !== 4) bad("damaged");
    info = {
      kind: "ecdsa",
      bits: c.bits,
      typeLabel: `ECDSA ${c.crv}`,
      jwk: {
        kty: "EC",
        crv: c.crv,
        x: toB64u(q.subarray(1, 1 + c.size)),
        y: toB64u(q.subarray(1 + c.size)),
      },
    };
  } else {
    return unsupported(label);
  }
  if (r.left) bad("damaged");
  return { ...info, label, blob };
}

async function fingerprint(blob) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", blob));
  return `SHA256:${toB64(h).replace(/=+$/, "")}`;
}

// ---- WebCrypto -------------------------------------------------------------

const importAlgo = (k) =>
  k.kind === "ed25519"
    ? { name: "Ed25519" }
    : k.kind === "rsa"
      ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
      : { name: "ECDSA", namedCurve: k.jwk.crv };
const signAlgo = (k) =>
  k.kind === "ecdsa" ? { name: "ECDSA", hash: "SHA-256" } : importAlgo(k);

// Non-extractable: once imported, the key material cannot be read back out by script.
async function importJwk(info, jwk, usage, failKey) {
  try {
    return await crypto.subtle.importKey("jwk", jwk, importAlgo(info), false, [
      usage,
    ]);
  } catch (e) {
    return bad(e?.name === "NotSupportedError" ? "noEd25519" : failKey);
  }
}

// ---- DER (only what PKCS#1, SEC1, PKCS#8 and SPKI need) --------------------

const OID = {
  rsa: "2a864886f70d010101",
  ec: "2a8648ce3d0201",
  ed25519: "2b6570",
  dsa: "2a8648ce380401",
};

function tlv(b, p) {
  if (p + 2 > b.length) bad("damaged");
  let len = b[p + 1];
  let start = p + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4 || start + n > b.length) bad("damaged");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[start + i];
    start += n;
  }
  if (start + len > b.length) bad("damaged");
  return { tag: b[p], start, end: start + len };
}
function children(b) {
  const out = [];
  let p = 0;
  while (p < b.length) {
    const t = tlv(b, p);
    out.push({ tag: t.tag, c: b.subarray(t.start, t.end) });
    p = t.end;
  }
  return out;
}
function seq(b) {
  const t = tlv(b, 0);
  if (t.tag !== 0x30 || t.end !== b.length) bad("damaged");
  return children(b.subarray(t.start, t.end));
}
const INT = 0x02;
const BITS = 0x03;
const OCTETS = 0x04;
const OBJECT_ID = 0x06;

function rsaFromPkcs1(der) {
  const ch = seq(der);
  if (ch.length < 9 || ch.slice(0, 9).some((x) => x.tag !== INT))
    bad("damaged");
  const [, n, e, d, p, q, dp, dq, qi] = ch
    .slice(0, 9)
    .map((x) => unsigned(x.c));
  const info = parseBlob(rsaBlob(n, e));
  const jwk = { ...info.jwk };
  for (const [k, v] of Object.entries({ d, p, q, dp, dq, qi }))
    jwk[k] = toB64u(v);
  return { info, jwk };
}

function ecFromSec1(der, curveOid) {
  const ch = seq(der);
  if (ch.length < 2 || ch[0].tag !== INT || ch[1].tag !== OCTETS)
    bad("damaged");
  let oid = curveOid;
  let q;
  for (const x of ch.slice(2)) {
    const inner = children(x.c)[0];
    if (x.tag === 0xa0) {
      // OpenSSL writes a named curve; LibreSSL (macOS) writes the full parameters: then the
      // public point's length picks the curve.
      if (inner?.tag === OBJECT_ID) oid = hex(inner.c);
      else if (inner?.tag !== 0x30) bad("damaged");
    } else if (x.tag === 0xa1) {
      if (inner?.tag !== BITS || inner.c[0] !== 0) bad("damaged");
      q = inner.c.subarray(1);
    }
  }
  if (!q) bad("inconsistent"); // every real tool writes the public point
  const name = oid
    ? Object.keys(CURVES).find((k) => CURVES[k].oid === oid)
    : EC_BY_POINT_LENGTH[q.length];
  if (!name) bad("unsupportedType");
  const info = parseBlob(ecBlob(name, q));
  const d = unsigned(ch[1].c);
  const size = CURVES[name].size;
  if (d.length > size) bad("inconsistent");
  const padded = cat(new Uint8Array(size - d.length), d);
  return { info, jwk: { ...info.jwk, d: toB64u(padded) } };
}

async function fromPkcs8(der) {
  const ch = seq(der);
  if (ch.length < 3 || ch[1].tag !== 0x30 || ch[2].tag !== OCTETS)
    bad("damaged");
  const alg = children(ch[1].c);
  if (alg[0]?.tag !== OBJECT_ID) bad("damaged");
  const oid = hex(alg[0].c);
  if (oid === OID.rsa) return rsaFromPkcs1(ch[2].c);
  if (oid === OID.ec) {
    if (alg[1]?.tag !== OBJECT_ID && alg[1]?.tag !== 0x30) bad("damaged");
    return ecFromSec1(
      ch[2].c,
      alg[1].tag === OBJECT_ID ? hex(alg[1].c) : undefined,
    );
  }
  if (oid === OID.dsa) return bad("dsa");
  if (oid !== OID.ed25519) return bad("unsupportedType");
  // PKCS#8 stores only the Ed25519 seed. Letting the browser derive the public half needs an
  // extractable key for a moment; the key that is kept is re-imported non-extractable.
  try {
    const tmp = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "Ed25519" },
      true,
      ["sign"],
    );
    const { x, d } = await crypto.subtle.exportKey("jwk", tmp);
    const info = parseBlob(edBlob(fromB64(x, true)));
    return { info, jwk: { ...info.jwk, d } };
  } catch (e) {
    return bad(e?.name === "NotSupportedError" ? "noEd25519" : "damaged");
  }
}

// ---- Private keys ----------------------------------------------------------

const clean = (text) => text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
const linesOf = (text) =>
  clean(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const PUBLIC_LINE = /^(ssh-(ed25519|rsa|dss)|ecdsa-sha2-\S+|sk-\S+)\s+\S/;

const MAGIC = "openssh-key-v1\0";

async function fromOpenssh(der) {
  const r = new Reader(der);
  if (new TextDecoder().decode(r.take(MAGIC.length)) !== MAGIC) bad("damaged");
  const cipher = r.text();
  r.str(); // kdf name
  r.str(); // kdf options
  if (r.u32() !== 1) bad("multipleKeys");
  const info = parseBlob(r.str());
  const section = r.str();
  if (cipher !== "none") return { info, encrypted: true };
  const p = new Reader(section);
  const check = p.u32();
  if (check !== p.u32()) bad("inconsistent"); // the two check integers must agree
  if (p.text() !== info.label) bad("inconsistent");
  let jwk;
  if (info.kind === "ed25519") {
    const pub = p.str();
    const sec = p.str();
    if (
      sec.length !== 64 ||
      !eq(edBlob(pub), info.blob) ||
      !eq(sec.subarray(32), pub)
    )
      bad("inconsistent");
    jwk = { ...info.jwk, d: toB64u(sec.subarray(0, 32)) };
  } else if (info.kind === "rsa") {
    const [n, e, d, qi, pp, q] = [0, 1, 2, 3, 4, 5].map(() =>
      unsigned(p.str()),
    );
    if (!eq(rsaBlob(n, e), info.blob)) bad("inconsistent");
    const dp = fromBig(big(d) % (big(pp) - 1n));
    const dq = fromBig(big(d) % (big(q) - 1n));
    jwk = { ...info.jwk };
    for (const [k, v] of Object.entries({ d, p: pp, q, dp, dq, qi }))
      jwk[k] = toB64u(v);
  } else {
    const name = p.text();
    const q = p.str();
    const d = unsigned(p.str());
    const size = CURVES[name]?.size;
    if (!size || d.length > size || !eq(ecBlob(name, q), info.blob))
      bad("inconsistent");
    jwk = { ...info.jwk, d: toB64u(cat(new Uint8Array(size - d.length), d)) };
  }
  return { info, jwk };
}

async function parsePrivate(raw) {
  if (raw.length > MAX_CHARS) bad("tooBig");
  const lines = linesOf(raw);
  if (!lines.length) bad("privateEmpty");
  if (lines[0].startsWith("PuTTY-User-Key-File")) bad("putty");
  const heads = lines.filter((l) => l.startsWith("-----BEGIN "));
  if (heads.length > 1) bad("multipleKeys");
  if (!heads.length)
    bad(PUBLIC_LINE.test(lines[0]) ? "privateIsPublic" : "privateNotKey");
  const label = /^-----BEGIN ([A-Z0-9 ]+)-----$/.exec(heads[0])?.[1];
  if (!label) bad("privateNotKey");
  if (label.endsWith("PUBLIC KEY")) bad("privateIsPublic");
  const start = lines.indexOf(heads[0]);
  const end = lines.indexOf(`-----END ${label}-----`, start + 1);
  if (end < 0) bad("privateTruncated");
  if (label === "DSA PRIVATE KEY") bad("dsa");
  const body = lines.slice(start + 1, end);
  if (
    label === "ENCRYPTED PRIVATE KEY" ||
    body.some((l) => /^(Proc-Type|DEK-Info):/.test(l))
  )
    bad("encryptedPem");
  const der = fromB64(body.join(""));
  let parsed;
  if (label === "OPENSSH PRIVATE KEY") parsed = await fromOpenssh(der);
  else if (label === "RSA PRIVATE KEY") parsed = rsaFromPkcs1(der);
  else if (label === "EC PRIVATE KEY") parsed = ecFromSec1(der);
  else if (label === "PRIVATE KEY") parsed = await fromPkcs8(der);
  else bad("privateNotKey");
  const { info, jwk, encrypted = false } = parsed;
  const failKey = info.kind === "rsa" ? "refused" : "inconsistent";
  const signKey = encrypted
    ? undefined
    : await importJwk(info, jwk, "sign", failKey);
  return {
    ...info,
    comment: "",
    encrypted,
    signKey,
    fingerprint: await fingerprint(info.blob),
  };
}

// ---- Public keys -----------------------------------------------------------

function spkiToBlob(der) {
  const ch = seq(der);
  if (
    ch.length !== 2 ||
    ch[0].tag !== 0x30 ||
    ch[1].tag !== BITS ||
    ch[1].c[0] !== 0
  )
    bad("damaged");
  const alg = children(ch[0].c);
  if (alg[0]?.tag !== OBJECT_ID) bad("damaged");
  const oid = hex(alg[0].c);
  const key = ch[1].c.subarray(1);
  if (oid === OID.ed25519) return edBlob(key);
  if (oid === OID.rsa) return pkcs1PublicToBlob(key);
  if (oid === OID.dsa) return bad("dsa");
  if (oid !== OID.ec) return bad("unsupportedType");
  const name =
    alg[1]?.tag === OBJECT_ID
      ? Object.keys(CURVES).find((k) => CURVES[k].oid === hex(alg[1].c))
      : EC_BY_POINT_LENGTH[key.length]; // LibreSSL writes full parameters, not a curve OID
  return name ? ecBlob(name, key) : bad("unsupportedType");
}
function pkcs1PublicToBlob(der) {
  const ch = seq(der);
  if (ch.length !== 2 || ch.some((x) => x.tag !== INT)) bad("damaged");
  return rsaBlob(unsigned(ch[0].c), unsigned(ch[1].c));
}

// PEM armor has five dashes; RFC 4716 (ssh-keygen -e) has four and spaces.
const BEGIN = /^-{4,5} ?BEGIN ([A-Z0-9 ]+?) ?-{4,5}$/;
const END = /^-{4,5} ?END ([A-Z0-9 ]+?) ?-{4,5}$/;
const LABEL =
  /^(ssh-(ed25519|rsa|dss)|ecdsa-sha2-[a-z0-9]+|sk-[a-z0-9-]+@openssh\.com)(-cert-v01@openssh\.com)?$/;

function rfc4716Body(lines) {
  let comment = "";
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(":")) {
      body.push(lines[i]);
      continue;
    }
    let header = lines[i];
    while (header.endsWith("\\") && i + 1 < lines.length)
      header = header.slice(0, -1) + lines[++i];
    const m = /^Comment:\s*"?(.*?)"?$/i.exec(header);
    if (m) comment = m[1];
  }
  return { comment, der: fromB64(body.join("")) };
}

async function parsePublic(raw) {
  if (raw.length > MAX_CHARS) bad("tooBig");
  const lines = linesOf(raw);
  if (!lines.length) bad("publicEmpty");
  let blob;
  let comment = "";
  if (BEGIN.test(lines[0])) {
    if (lines.filter((l) => BEGIN.test(l)).length > 1) bad("multipleKeys");
    const label = BEGIN.exec(lines[0])?.[1] ?? "";
    if (label.endsWith("PRIVATE KEY")) bad("publicIsPrivate");
    if (!label.endsWith("PUBLIC KEY")) bad("publicNotKey");
    if (END.exec(lines.at(-1))?.[1] !== label) bad("publicDamaged");
    const body = lines.slice(1, -1);
    if (label === "SSH2 PUBLIC KEY") {
      const r = rfc4716Body(body);
      comment = r.comment;
      blob = r.der;
    } else if (label === "PUBLIC KEY")
      blob = spkiToBlob(fromB64(body.join("")));
    else if (label === "RSA PUBLIC KEY")
      blob = pkcs1PublicToBlob(fromB64(body.join("")));
    else bad("publicNotKey");
  } else {
    if (lines.length > 1) bad("multipleKeys");
    if (lines[0].startsWith("PuTTY-User-Key-File")) bad("publicNotKey");
    const tokens = lines[0].split(/\s+/);
    const at = tokens.findIndex((t) => LABEL.test(t)); // skips an authorized_keys options prefix
    if (at < 0 || !tokens[at + 1]) bad("publicNotKey");
    blob = fromB64(tokens[at + 1]);
    comment = tokens.slice(at + 2).join(" ");
    const info = parseBlob(blob);
    if (info.label !== tokens[at]) bad("labelMismatch");
  }
  const info = parseBlob(blob);
  return { ...info, comment, fingerprint: await fingerprint(blob) };
}

// ---- Public API ------------------------------------------------------------

async function read(parse, field, text) {
  try {
    return { ok: true, key: await parse(text) };
  } catch (e) {
    const key = e instanceof Bad ? e.message : "damaged";
    return {
      ok: false,
      error:
        key === "damaged"
          ? `${field}Damaged`
          : key === "inconsistent"
            ? "privateInconsistent"
            : key,
    };
  }
}
export const readPrivateKey = (text) => read(parsePrivate, "private", text);
export const readPublicKey = (text) => read(parsePublic, "public", text);

// status: match | publicPartMatch | mismatch | typeMismatch | damaged | noEd25519 | refused
export async function checkPair(priv, pub) {
  const info = {
    privateFingerprint: priv.fingerprint,
    publicFingerprint: pub.fingerprint,
    privateType: priv.typeLabel,
    publicType: pub.typeLabel,
    bits: pub.bits,
    comment: pub.comment,
    weakRsa: pub.kind === "rsa" && pub.bits < 2048,
  };
  if (priv.label !== pub.label) return { status: "typeMismatch", ...info };
  if (priv.fingerprint !== pub.fingerprint)
    return { status: "mismatch", ...info };
  if (priv.encrypted) return { status: "publicPartMatch", ...info };
  try {
    const verifyKey = await importJwk(pub, pub.jwk, "verify", "refused");
    const data = crypto.getRandomValues(new Uint8Array(32));
    const sig = await crypto.subtle.sign(signAlgo(pub), priv.signKey, data);
    const ok = await crypto.subtle.verify(signAlgo(pub), verifyKey, sig, data);
    return { status: ok ? "match" : "damaged", ...info };
  } catch (e) {
    return { status: e instanceof Bad ? e.message : "damaged", ...info };
  }
}

// A fresh Ed25519 pair, written as the two files ssh-keygen would write. Never stored.
export async function samplePair() {
  let pair;
  try {
    pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ]);
  } catch {
    return { ok: false, error: "noEd25519" };
  }
  const { x, d } = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = fromB64(x, true);
  const seed = fromB64(d, true);
  const comment = "sample@ssh-key-checker";
  const check = crypto.getRandomValues(new Uint8Array(4));
  const inner = cat(
    check,
    check,
    wireStr("ssh-ed25519"),
    sshStr(pub),
    sshStr(cat(seed, pub)),
    wireStr(comment),
  );
  const padding = Uint8Array.from(
    { length: (8 - (inner.length % 8)) % 8 },
    (_, i) => i + 1,
  );
  const file = cat(
    enc.encode(MAGIC),
    wireStr("none"),
    wireStr("none"),
    sshStr(new Uint8Array()),
    u32b(1),
    sshStr(edBlob(pub)),
    sshStr(cat(inner, padding)),
  );
  return {
    ok: true,
    privateText: `-----BEGIN OPENSSH PRIVATE KEY-----\n${toB64(file)
      .match(/.{1,70}/g)
      .join("\n")}\n-----END OPENSSH PRIVATE KEY-----\n`,
    publicText: `ssh-ed25519 ${toB64(edBlob(pub))} ${comment}\n`,
  };
}
