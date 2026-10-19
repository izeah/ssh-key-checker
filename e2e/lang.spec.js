import { expect, test } from "@playwright/test";
import { DEFAULT_LANG, dict, otherLang, pageTitle } from "../src/lib/lang.js";

const other = otherLang(DEFAULT_LANG);
const before = dict(DEFAULT_LANG);
const after = dict(other);

test("switching the language translates the page in place and keeps what the user typed", async ({
  page,
}) => {
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", DEFAULT_LANG); // first visit, no cookie

  await page.getByLabel(before.login.email).fill("admin@example.com");
  await page.getByLabel(before.login.password).fill("wrong-password");
  await page
    .getByRole("button", { name: before.login.submit, exact: true })
    .click();
  const alert = page.getByRole("alert"); // Next adds its own route announcer: match the text
  await expect(
    alert.filter({ hasText: before.login.errors.invalidCredentials }),
  ).toBeVisible();

  await page.locator("button.lang-toggle").click();
  await expect(html).toHaveAttribute("lang", other);
  await expect(page).toHaveTitle(pageTitle(after.login.title));
  await expect(page.getByLabel(after.login.email)).toHaveValue(
    "admin@example.com",
  );
  await expect(page.getByLabel(after.login.password)).toHaveValue(
    "wrong-password",
  );
  // The error on screen is a key, so it follows the switch.
  await expect(
    alert.filter({ hasText: after.login.errors.invalidCredentials }),
  ).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute("lang", other); // the cookie
  await expect(
    page.getByRole("button", { name: after.login.submit, exact: true }),
  ).toBeVisible();
});
