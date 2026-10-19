import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DEFAULT_LANG, dict } from "../src/lib/lang.js";
import { makeFixtures } from "./keys.mjs";

const t = dict(DEFAULT_LANG);
const plain = (s) => s.replaceAll("`", "");
let fx;
test.beforeAll(() => {
  fx = makeFixtures();
});
test.afterAll(() => fx?.cleanup());

const priv = (page) => page.locator("#key-private");
const pub = (page) => page.locator("#key-public");
const result = (page) => page.locator(".result");
const checkButton = (page) =>
  page.getByRole("button", { name: t.actions.check, exact: true });

async function fill(page, privateText, publicText) {
  await priv(page).fill(privateText);
  await pub(page).fill(publicText);
}
async function check(page) {
  await checkButton(page).click();
  await expect(checkButton(page)).toBeEnabled();
}

async function dropFiles(page, selector, files) {
  const dt = await page.evaluateHandle((list) => {
    const data = new DataTransfer();
    for (const f of list) data.items.add(new File([f.text], f.name));
    return data;
  }, files);
  await page.locator(selector).dispatchEvent("drop", { dataTransfer: dt });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    t.hero.title,
  );
});

test("a real pair is a match and shows the fingerprint ssh-keygen prints", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  await fill(page, k.private, k.public);
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);
  await expect(result(page)).toContainText(k.fingerprint);
  await expect(page.locator(".seam")).toHaveText("=");
});

test("every key type from ssh-keygen matches its own public key", async ({
  page,
}) => {
  for (const name of [
    "rsa2048",
    "ecdsa256",
    "ecdsa384",
    "ecdsa521",
    "rsaPem",
    "ecPem",
    "rsaPkcs8",
  ]) {
    const k = fx.keys[name];
    await fill(page, k.private, k.public);
    await check(page);
    await expect(result(page), name).toContainText(t.result.match.title);
  }
});

test("different pairs and different types are not a pair", async ({ page }) => {
  await fill(page, fx.keys.ed25519.private, fx.keys.ed25519b.public);
  await check(page);
  await expect(result(page)).toContainText(t.result.mismatch.title);
  await expect(result(page)).toContainText(fx.keys.ed25519.fingerprint);
  await expect(result(page)).toContainText(fx.keys.ed25519b.fingerprint);
  await expect(page.locator(".seam")).toHaveText("≠");

  await fill(page, fx.keys.ed25519.private, fx.keys.rsa2048.public);
  await check(page);
  await expect(result(page)).toContainText(
    t.result.typeMismatch.body("ED25519", "RSA"),
  );
});

test("a passphrase-protected OpenSSH key checks only its public part, and says so", async ({
  page,
}) => {
  const k = fx.keys.edLocked;
  await fill(page, k.private, k.public);
  await expect(page.locator("#key-private-status")).toContainText(
    t.status.locked,
  );
  await check(page);
  await expect(result(page)).toContainText(t.result.publicPart.title);
});

test("an empty submit marks both fields, focuses the first, and keeps the layout", async ({
  page,
}) => {
  await check(page);
  await expect(page.locator("#key-private-status")).toContainText(
    t.errors.privateEmpty,
  );
  await expect(page.locator("#key-public-status")).toContainText(
    plain(t.errors.publicEmpty),
  );
  await expect(priv(page)).toHaveAttribute("aria-invalid", "true");
  await expect(priv(page)).toBeFocused();
  await expect(result(page)).toContainText(t.result.blocked);
});

test("each wrong input gets its own human message next to its field", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  const cases = [
    [priv, "halo dunia", t.errors.privateNotKey.split("`")[0]],
    [priv, k.public, t.errors.privateIsPublic],
    [
      priv,
      k.private.split("\n").slice(0, -2).join("\n"),
      t.errors.privateTruncated.split("`")[0],
    ],
    [
      priv,
      "PuTTY-User-Key-File-3: ssh-ed25519\nEncryption: none",
      t.errors.putty.split("`")[0],
    ],
    [priv, fx.keys.rsaPemLocked.private, t.errors.encryptedPem.split("`")[0]],
    [pub, "halo dunia", t.errors.publicNotKey],
    [pub, k.private, t.errors.publicIsPrivate],
    [pub, `${k.public.trim()}\n${k.public.trim()}`, t.errors.multipleKeys],
    [pub, k.public.trim().slice(0, 40), t.errors.publicDamaged.split("`")[0]],
  ];
  for (const [field, text, message] of cases) {
    await field(page).fill(text);
    const status = page.locator(
      `#${field === priv ? "key-private" : "key-public"}-status`,
    );
    await expect(status, message).toContainText(
      plain(message).trim().slice(0, 60),
    );
    await expect(field(page)).toHaveAttribute("aria-invalid", "true");
    await field(page).fill("");
  }
});

test("keys in the wrong fields can be swapped with one click", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  await fill(page, k.public, k.private);
  const swap = page.getByRole("button", { name: t.actions.swap });
  await expect(swap).toBeVisible();
  await swap.click();
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);
  await expect(swap).toBeHidden();
});

test("files: choose (also one with no extension), size and binary limits", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  await page.locator("input[type=file]").nth(0).setInputFiles(k.file); // id_ed25519-style name, no extension
  await page.locator("input[type=file]").nth(1).setInputFiles(`${k.file}.pub`);
  await expect(priv(page)).toHaveValue(readFileSync(k.file, "utf8"));
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);

  await page
    .locator("input[type=file]")
    .nth(0)
    .setInputFiles({
      name: "big.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(40_000, "a"),
    });
  await expect(page.locator("#key-private-status")).toContainText(
    t.errors.tooBig.slice(0, 40),
  );
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0xff, 0xfe]),
    });
  await expect(page.locator("#key-public-status")).toContainText(
    t.errors.notText.slice(0, 30),
  );
  // Typing replaces the file error.
  await priv(page).fill("x");
  await expect(page.locator("#key-private-status")).not.toContainText(
    t.errors.tooBig.slice(0, 40),
  );
});

test("dropping two files at once sends each to the right field", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  await dropFiles(page, ".pane >> nth=0", [
    { name: "id_ed25519.pub", text: k.public },
    { name: "id_ed25519", text: k.private },
  ]);
  await expect(priv(page)).toHaveValue(k.private);
  await expect(pub(page)).toHaveValue(k.public);
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);
});

test("clear, clear both and the sample pair", async ({ page }) => {
  const k = fx.keys.ed25519;
  await fill(page, k.private, k.public);
  await page.getByRole("button", { name: t.file.clear }).first().click();
  await expect(priv(page)).toHaveValue("");
  await expect(pub(page)).toHaveValue(k.public);

  await page.getByRole("button", { name: t.actions.sample }).click();
  await expect(page.getByText(t.sample.note)).toBeVisible();
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);

  await page.getByRole("button", { name: t.actions.clearBoth }).click();
  await expect(priv(page)).toHaveValue("");
  await expect(pub(page)).toHaveValue("");
  await expect(result(page)).toContainText(t.result.idle.slice(0, 30));
});

test("copy fingerprint puts the exact value on the clipboard", async ({
  browser,
}) => {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await page.goto("/");
  const k = fx.keys.ecdsa256;
  await fill(page, k.private, k.public);
  await check(page);
  await page.getByRole("button", { name: t.result.copy }).click();
  await expect(
    page.getByRole("button", { name: t.result.copied }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    k.fingerprint,
  );
  await context.close();
});

test("terms and privacy open as dialogs and close by button, Escape and backdrop, returning focus", async ({
  page,
}) => {
  for (const [name, title] of [
    [t.footer.terms, t.legal.terms.title],
    [t.footer.privacy, t.legal.privacy.title],
  ]) {
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("[REAL DATA]");
    await expect(page).toHaveURL(/\/$/); // same page, no navigation

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole("button", { name: t.legal.close }).click();
    await expect(dialog).toBeHidden();

    await trigger.click();
    await page.mouse.click(3, 3); // the backdrop
    await expect(dialog).toBeHidden();
  }
});

test("the whole flow works with the keyboard and every stop shows a focus ring", async ({
  page,
}) => {
  const k = fx.keys.ed25519;
  await priv(page).focus();
  await page.keyboard.insertText(k.private);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab"); // choose file, clear
  await pub(page).focus();
  await page.keyboard.insertText(k.public);
  await checkButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(result(page)).toContainText(t.result.match.title);

  await page.locator("body").click({ position: { x: 2, y: 2 } });
  const stops = [];
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const e = document.activeElement;
        const s = getComputedStyle(e);
        return {
          tag: e.tagName,
          ring:
            s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 2,
        };
      }),
    );
  }
  expect(stops.length).toBeGreaterThan(10);
  expect(stops.filter((s) => !s.ring)).toEqual([]);
});

test("nothing leaves the browser and nothing is stored", async ({
  page,
  context,
}) => {
  await page.reload();
  await page.waitForLoadState("networkidle");
  const sent = [];
  page.on("request", (r) =>
    sent.push({ url: r.url(), method: r.method(), body: r.postData() }),
  );
  page.on("websocket", (w) => sent.push({ url: w.url(), method: "WS" }));

  const k = fx.keys.rsa2048;
  await fill(page, k.private, k.public);
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);
  await page.getByRole("button", { name: t.actions.sample }).click();
  await check(page);
  await page
    .getByRole("button", { name: t.footer.privacy, exact: true })
    .click();
  await page.keyboard.press("Escape");

  // Only same-origin GETs for the page's own files (a font loads when its glyphs first appear).
  const origin = new URL(page.url()).origin;
  for (const r of sent) {
    expect(r.method, r.url).toBe("GET");
    expect(r.url.startsWith(`${origin}/assets/`), r.url).toBe(true);
    expect(r.url).not.toContain(k.fingerprint);
  }

  // The CSP in the production build forbids every outgoing connection, even from injected code.
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("connect-src 'none'");
  expect(csp).toContain("form-action 'none'");
  // Each attempt must end in a connect-src violation and never reach the network.
  const attempts = await page.evaluate(async () => {
    const violations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      violations.push(e.violatedDirective),
    );
    const fetchResult = await fetch("/robots.txt").then(
      () => "sent",
      () => "blocked",
    );
    navigator.sendBeacon("/beacon", "x");
    const ws = await new Promise((done) => {
      // nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket -- the test proves the CSP refuses an outgoing socket, so it must try one
      const sock = new WebSocket(`ws://${location.host}/socket`);
      sock.onopen = () => done("opened");
      sock.onerror = () => done("blocked");
    });
    await new Promise((r) => setTimeout(r, 200));
    return { fetchResult, ws, violations };
  });
  expect(attempts.fetchResult).toBe("blocked");
  expect(attempts.ws).toBe("blocked");
  expect(attempts.violations.length).toBeGreaterThanOrEqual(3);
  expect(attempts.violations.every((d) => d.startsWith("connect-src"))).toBe(
    true,
  );
  expect(sent.some((r) => /robots\.txt|beacon|socket/.test(r.url))).toBe(false);

  const stored = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    idb: (await indexedDB.databases()).length,
    cookie: document.cookie,
  }));
  expect(stored).toEqual({ local: [], session: [], idb: 0, cookie: "" });
  expect(page.url()).not.toMatch(/BEGIN|ssh-|AAAA/);
  const cookies = await context.cookies();
  expect(
    cookies.map((c) => c.name).filter((n) => !["lang", "theme"].includes(n)),
  ).toEqual([]);
});

test("it still answers with the network switched off", async ({
  page,
  context,
}) => {
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  const k = fx.keys.ecdsa384;
  await fill(page, k.private, k.public);
  await check(page);
  await expect(result(page)).toContainText(t.result.match.title);
  await context.setOffline(false);
});

test("no console errors or CSP violations in a full run", async ({ page }) => {
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) problems.push(m.text());
  });
  await page.reload();
  const k = fx.keys.ed25519;
  await fill(page, k.private, k.public);
  await check(page);
  await page.getByRole("button", { name: t.footer.terms, exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator("button.lang-toggle").click();
  await page.locator("button.theme-toggle").click();
  expect(problems).toEqual([]);
});
