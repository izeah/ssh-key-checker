// Real keys for the tests, made by ssh-keygen into a temp dir that cleanup() removes. Nothing here
// is committed: a private key in the repo would be a leak waiting for a scanner.
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (...args) =>
  execFileSync("ssh-keygen", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const tryRun = (...args) => {
  try {
    return run(...args);
  } catch {
    return undefined;
  }
};

export const PASSPHRASE = "correct horse battery";

// name -> { private, public, fingerprint, rfc4716?, spki?, pkcs1?, file }
export function makeFixtures() {
  const dir = mkdtempSync(join(tmpdir(), "skc-"));
  const keys = {};
  const gen = (name, type, extra = [], pass = "") => {
    const file = join(dir, name);
    if (
      tryRun(
        "-q",
        "-t",
        type,
        ...extra,
        "-N",
        pass,
        "-C",
        `${name}@test`,
        "-f",
        file,
      ) === undefined
    )
      return;
    keys[name] = {
      file,
      private: readFileSync(file, "utf8"),
      public: readFileSync(`${file}.pub`, "utf8"),
      fingerprint: run("-lf", `${file}.pub`).split(" ")[1],
      rfc4716: tryRun("-e", "-f", `${file}.pub`),
      spki: tryRun("-e", "-m", "PKCS8", "-f", `${file}.pub`),
      pkcs1:
        type === "rsa"
          ? tryRun("-e", "-m", "PEM", "-f", `${file}.pub`)
          : undefined,
    };
  };
  gen("ed25519", "ed25519");
  gen("ed25519b", "ed25519");
  gen("rsa1024", "rsa", ["-b", "1024"]);
  gen("rsa2048", "rsa", ["-b", "2048"]);
  gen("rsa3072", "rsa", ["-b", "3072"]);
  gen("rsa4096", "rsa", ["-b", "4096"]);
  gen("ecdsa256", "ecdsa", ["-b", "256"]);
  gen("ecdsa384", "ecdsa", ["-b", "384"]);
  gen("ecdsa521", "ecdsa", ["-b", "521"]);
  gen("rsaPem", "rsa", ["-b", "2048", "-m", "PEM"]);
  gen("ecPem", "ecdsa", ["-b", "256", "-m", "PEM"]);
  gen("rsaPkcs8", "rsa", ["-b", "2048", "-m", "PKCS8"]);
  gen("ecPkcs8", "ecdsa", ["-b", "256", "-m", "PKCS8"]);
  gen("edLocked", "ed25519", [], PASSPHRASE);
  gen("rsaPemLocked", "rsa", ["-b", "2048", "-m", "PEM"], PASSPHRASE);

  // Ed25519 as PKCS#8 / SPKI: ssh-keygen may not write it, Node does.
  const ed = generateKeyPairSync("ed25519");
  const pkcs8 = ed.privateKey.export({ type: "pkcs8", format: "pem" });
  const spki = ed.publicKey.export({ type: "spki", format: "pem" });
  const spkiFile = join(dir, "edPkcs8.spki");
  writeFileSync(spkiFile, spki);
  keys.edPkcs8 = {
    private: pkcs8,
    spki,
    public: tryRun("-i", "-m", "PKCS8", "-f", spkiFile)?.trim(),
  };
  return {
    keys,
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
