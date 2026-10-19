import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { CSP } from "../../vite.shared.js";

// The CSP lives in three places (the <meta> from vite.shared.js, nginx.conf, vercel.json). The two
// server copies add frame-ancestors, which a <meta> cannot carry; everything else must be identical.
const withoutFrameAncestors = (csp) =>
  csp.replace(/; frame-ancestors 'none'$/, "");

test("nginx.conf and vercel.json carry the same CSP as the build", () => {
  const nginx = /Content-Security-Policy "([^"]+)"/.exec(
    readFileSync("nginx.conf", "utf8"),
  )[1];
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"))
    .headers.flatMap((h) => h.headers)
    .find((h) => h.key === "Content-Security-Policy").value;
  for (const csp of [nginx, vercel]) {
    expect(csp).toMatch(/; frame-ancestors 'none'$/);
    expect(withoutFrameAncestors(csp)).toBe(CSP);
  }
  expect(CSP).toContain("connect-src 'none'");
});

test("robots.txt and sitemap.xml point at the production host", () => {
  const host = "https://ssh-key-checker.izeah.my.id";
  expect(readFileSync("public/robots.txt", "utf8")).toContain(
    `Sitemap: ${host}/sitemap.xml`,
  );
  expect(readFileSync("public/sitemap.xml", "utf8")).toContain(
    `<loc>${host}/</loc>`,
  );
  expect(readFileSync("index.html", "utf8")).toContain(
    `<link rel="canonical" href="${host}/" />`,
  );
});
