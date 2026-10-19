import { expect, test } from "@playwright/test";

const HOST = "https://ssh-key-checker.izeah.my.id";

// This is a single-page tool that should be found, so "/" is indexable and carries its meta tags in
// the HTML a crawler gets without running JavaScript. Any other path is the not-found screen.
test("the page is indexable and describes itself without JavaScript", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('<meta name="robots" content="index, follow"');
  expect(html).toContain(`<link rel="canonical" href="${HOST}/"`);
  expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]{60,170}"/);
  expect(html).toContain('property="og:title"');

  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
});

test("an unknown path is a not-found screen that says noindex, with a way back", async ({
  page,
}) => {
  await page.goto("/no-such-page");
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((els) => els.map((e) => e.content));
  expect(robots).toContain("noindex");
  await page.getByRole("link").filter({ hasText: /.+/ }).last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("robots.txt allows crawling and names the sitemap, which lists the page", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/^User-agent: \*$/m);
  expect(robots).toMatch(/^Allow: \/$/m);
  expect(robots).toContain(`Sitemap: ${HOST}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.headers()["content-type"]).toContain("xml");
  expect(await sitemap.text()).toContain(`<loc>${HOST}/</loc>`);
});
