import { expect, test } from "@playwright/test";
import { DEFAULT_LANG, dict, otherLang, pageTitle } from "../src/lib/lang.js";
import { makeFixtures } from "./keys.mjs";

// `make ui-shots` runs this file. It writes ui-shots/<screen>-<width>-<lang>-<theme>.png for every
// screen at 375, 768 and 1280 px: the default language in both themes, the other language in
// light (its strings have other lengths). Open the PNGs and look at them. The assertions only catch
// what a picture cannot show (horizontal overflow, console errors, title, lang) and that both
// toggles are on every screen.
const WIDTHS = [375, 768, 1280];
const RUNS = [
  [DEFAULT_LANG, "light"],
  [DEFAULT_LANG, "dark"],
  [otherLang(DEFAULT_LANG), "light"],
];
const MISSING = "/no-such-page"; // the not-found screen is a 404 on purpose

let fx;
test.beforeAll(() => {
  fx = makeFixtures();
});
test.afterAll(() => fx?.cleanup());

// <title> elements in the document (not an SVG's). toHaveTitle reads only the first one, so a second
// title (a layout or metadata default next to the page's own) would pass it unnoticed.
const titleCount = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("title")].filter((t) => !t.closest("svg"))
        .length,
  );

function watch(page) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Expected: the deliberate 404 of the not-found screen.
    const url = m.location().url;
    if (url.endsWith(MISSING)) return;
    problems.push(`console: ${m.text()} (${url})`);
  });
  return problems;
}

// Sets the language and theme through the toggles, the way a user would. The context starts in
// light, so no data-theme means light.
async function choose(page, lang, theme) {
  const html = page.locator("html");
  if ((await html.getAttribute("lang")) !== lang) {
    await page.locator("button.lang-toggle").click();
    await expect(html).toHaveAttribute("lang", lang);
  }
  if (((await html.getAttribute("data-theme")) ?? "light") !== theme) {
    await page.locator("button.theme-toggle").click();
    await expect(html).toHaveAttribute("data-theme", theme);
  }
}

async function shoot(page, screen, title, width, lang, theme) {
  for (const toggle of ["theme-toggle", "lang-toggle"]) {
    await expect(
      page.locator(`.${toggle}`),
      `${screen} has no ${toggle}`,
    ).toBeVisible();
  }
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page).toHaveTitle(pageTitle(title));
  expect(await titleCount(page), `${screen} has more than one <title>`).toBe(1);
  if (theme === "dark")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(
    overflow,
    `${screen} scrolls horizontally at ${width}px`,
  ).toBeLessThanOrEqual(0);
  await page.waitForTimeout(250); // the result panel rises in 160ms
  await page.screenshot({
    path: `ui-shots/${screen}-${width}-${lang}-${theme}.png`,
    fullPage: true,
  });
}

for (const width of WIDTHS) {
  test(`every screen at ${width}px in both languages and themes`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      colorScheme: "light",
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await context.newPage();
    const problems = watch(page);
    const a = fx.keys.ed25519;
    const b = fx.keys.ed25519b;

    for (const [lang, theme] of RUNS) {
      const t = dict(lang);
      const fill = async (priv, pub) => {
        await page.locator("#key-private").fill(priv);
        await page.locator("#key-public").fill(pub);
      };
      const submit = () =>
        page
          .getByRole("button", { name: t.actions.check, exact: true })
          .click();

      await page.goto("/");
      await choose(page, lang, theme);
      await shoot(page, "empty", t.meta.title, width, lang, theme);

      await fill(a.private, a.public);
      await submit();
      await expect(page.locator(".result h2")).toContainText(
        t.result.match.title,
      );
      await shoot(page, "match", t.meta.title, width, lang, theme);

      await fill(a.private, b.public);
      await submit();
      await expect(page.locator(".result h2")).toContainText(
        t.result.mismatch.title,
      );
      await shoot(page, "mismatch", t.meta.title, width, lang, theme);

      await fill(a.public, "halo dunia");
      await submit();
      await expect(page.locator("#key-private-status")).toHaveAttribute(
        "data-state",
        "error",
      );
      await shoot(page, "error", t.meta.title, width, lang, theme);

      await page
        .getByRole("button", { name: t.footer.privacy, exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(300); // the sheet slides in
      await shoot(page, "dialog", t.meta.title, width, lang, theme);
      await page.keyboard.press("Escape");

      await page.goto(MISSING);
      await shoot(page, "not-found", t.notFound.title, width, lang, theme);
    }

    expect(problems).toEqual([]);
    await context.close();
  });
}

test("a first visit follows the OS; the toggle overrides it and the choice survives a reload", async ({
  browser,
}) => {
  const [dark, light] = await Promise.all([
    browser.newContext({ colorScheme: "dark" }),
    browser.newContext({ colorScheme: "light" }),
  ]);
  const [d, l] = await Promise.all([dark.newPage(), light.newPage()]);
  await Promise.all([d.goto("/"), l.goto("/")]);
  const background = (p) =>
    p.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await expect(d.locator("html")).not.toHaveAttribute("data-theme", /.*/); // no choice yet
  const toggle = d.locator("button.theme-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true"); // the OS says dark
  expect(await background(d)).not.toBe(await background(l));

  await toggle.click(); // against the OS
  await expect(d.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await background(d)).toBe(await background(l));

  await d.reload();
  await expect(d.locator("html")).toHaveAttribute("data-theme", "light"); // the cookie beat the OS
  await Promise.all([dark.close(), light.close()]);
});
