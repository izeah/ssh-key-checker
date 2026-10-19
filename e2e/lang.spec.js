import { expect, test } from "@playwright/test";
import { DEFAULT_LANG, dict, otherLang, pageTitle } from "../src/lib/lang.js";
import { makeFixtures } from "./keys.mjs";

const other = otherLang(DEFAULT_LANG);
const before = dict(DEFAULT_LANG);
const after = dict(other);
let fx;
test.beforeAll(() => {
  fx = makeFixtures();
});
test.afterAll(() => fx?.cleanup());

test("switching the language translates the page in place and keeps keys, result and error", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", DEFAULT_LANG); // first visit, no cookie

  const k = fx.keys.ed25519;
  await page.locator("#key-private").fill(k.private);
  await page.locator("#key-public").fill("halo dunia");
  await page
    .getByRole("button", { name: before.actions.check, exact: true })
    .click();
  await expect(page.locator("#key-public-status")).toContainText(
    before.errors.publicNotKey.slice(0, 30),
  );

  await page.locator("button.lang-toggle").click();
  await expect(html).toHaveAttribute("lang", other);
  await expect(page).toHaveTitle(pageTitle(after.meta.title));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    after.hero.title,
  );
  await expect(page.locator("#key-private")).toHaveValue(k.private);
  await expect(page.locator("#key-public")).toHaveValue("halo dunia");
  // The error and the result on screen are keys, so they follow the switch.
  await expect(page.locator("#key-public-status")).toContainText(
    after.errors.publicNotKey.slice(0, 30),
  );

  await page.locator("#key-public").fill(k.public);
  await page
    .getByRole("button", { name: after.actions.check, exact: true })
    .click();
  await expect(page.locator(".result")).toContainText(after.result.match.title);
  await page.locator("button.lang-toggle").click();
  await expect(page.locator(".result")).toContainText(
    before.result.match.title,
  );

  await page.reload();
  await expect(html).toHaveAttribute("lang", DEFAULT_LANG); // the cookie
  await expect(page.locator("#key-private")).toHaveValue(""); // keys never survive a reload
});
