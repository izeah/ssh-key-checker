import { expect, test } from "@playwright/test";

// A SPA renders meta tags with JavaScript, which social previews and many crawlers never run: this
// is a tool, not a page that must rank. Every route says noindex and robots.txt lets crawlers read it.
test("every screen says noindex, and robots.txt does not hide them", async ({
  page,
}) => {
  for (const path of ["/", "/no-such-page"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute(
      "content",
      "noindex",
    );
  }
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toMatch(/^User-agent: \*$/m);
  expect(robots).toMatch(/^Disallow:\s*$/m);
});

test("an unknown path is a not-found page with a way back", async ({
  page,
}) => {
  await page.goto("/no-such-page");
  await page.getByRole("link").filter({ hasText: /.+/ }).last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
