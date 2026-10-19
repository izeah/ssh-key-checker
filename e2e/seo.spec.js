import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES } from "../src/lib/seo.js";

// A SPA renders meta tags with JavaScript, which social previews and many crawlers never run: this
// app has no indexable page. index.html says noindex on every route; robots.txt lets crawlers read it.
test("every screen says noindex, and robots.txt does not hide them", async ({
  page,
}) => {
  for (const path of [
    "/login",
    ...PUBLIC_PAGES.map((p) => `/${p}`),
    "/no-such-page",
  ]) {
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
