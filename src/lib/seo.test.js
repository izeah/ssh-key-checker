import { expect, test } from "vitest";
import {
  alternates,
  indexable,
  publicRoute,
  requestLang,
  robotsTxt,
  sitemapXml,
} from "./seo.js";

const ORIGIN = "https://app.example.com";

test("only /<lang>/<public page> is a public route", () => {
  expect(publicRoute("/en/terms")).toEqual({ lang: "en", page: "terms" });
  expect(publicRoute("/id/privacy/")).toEqual({ lang: "id", page: "privacy" });
  for (const path of [
    "/",
    "/login",
    "/dashboard",
    "/fr/privacy",
    "/id/pricing",
    "/id/privacy/x",
    "/privacy",
  ]) {
    expect(publicRoute(path)).toBeUndefined();
  }
});

test("a public URL beats the cookie, which beats the default", () => {
  expect(requestLang("/en/privacy", "id")).toBe("en");
  expect(requestLang("/login", "en")).toBe("en");
  expect(requestLang("/login", '"><script>')).toBe("id");
  expect(requestLang("/dashboard", undefined)).toBe("id");
});

test("app pages are not indexable, public pages and crawler files are", () => {
  for (const path of [
    "/",
    "/login",
    "/dashboard",
    "/no-such-page",
    "/id/pricing",
  ]) {
    expect(indexable(path)).toBe(false);
  }
  for (const path of [
    "/id/privacy",
    "/en/terms",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    expect(indexable(path)).toBe(true);
  }
});

test("alternates name both languages and x-default, as absolute URLs", () => {
  expect(alternates(ORIGIN, "terms")).toEqual([
    { hreflang: "id", href: `${ORIGIN}/id/terms` },
    { hreflang: "en", href: `${ORIGIN}/en/terms` },
    { hreflang: "x-default", href: `${ORIGIN}/id/terms` },
  ]);
});

test("the sitemap lists every public page in both languages with its alternates, nothing else", () => {
  const xml = sitemapXml(ORIGIN);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([
    `${ORIGIN}/id/privacy`,
    `${ORIGIN}/en/privacy`,
    `${ORIGIN}/id/terms`,
    `${ORIGIN}/en/terms`,
  ]);
  expect(xml.match(/<xhtml:link /g)).toHaveLength(locs.length * 3);
  expect(xml).not.toContain("/login");
});

test("robots.txt keeps crawlers out of the BFF and names the sitemap", () => {
  expect(robotsTxt(ORIGIN)).toBe(
    `User-agent: *\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
  );
});
