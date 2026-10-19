// Public pages (indexed, with SEO) versus app pages (noindex). PUBLIC_PAGES is the one list: it
// validates the /[lang]/[page] route and drives sitemap.xml and the X-Robots-Tag split. A public
// page carries its language in the URL so both languages are indexed; app pages use the lang cookie.
import { DEFAULT_LANG, dict, LANGS, langFrom, pageTitle } from "./lang.js";

export const PUBLIC_PAGES = ["privacy", "terms"];

export const isPublicPage = (page) => PUBLIC_PAGES.includes(page);

export const publicPath = (lang, page) => `/${lang}/${page}`;

// "/en/terms" gives { lang: "en", page: "terms" }; an app page or an unknown path gives undefined.
export function publicRoute(pathname) {
  const [, first, second, ...rest] = pathname.replace(/\/$/, "").split("/");
  const lang = langFrom(first);
  return lang && second && isPublicPage(second) && rest.length === 0
    ? { lang, page: second }
    : undefined;
}

// The language of a request: a public page's URL decides, then the lang cookie, then DEFAULT_LANG.
export const requestLang = (pathname, cookie) =>
  publicRoute(pathname)?.lang ?? langFrom(cookie) ?? DEFAULT_LANG;

// Only public pages and the two crawler files may be indexed; every other response says noindex.
// (robots.txt never hides an app page: a Disallow would stop crawlers from reading its noindex.)
export const indexable = (pathname) =>
  publicRoute(pathname) !== undefined ||
  pathname === "/robots.txt" ||
  pathname === "/sitemap.xml";

const OG_LOCALE = { id: "id_ID", en: "en_US" };

// One page in every language plus x-default (the DEFAULT_LANG version), as absolute URLs.
export const alternates = (origin, page) => [
  ...LANGS.map((lang) => ({
    hreflang: lang,
    href: origin + publicPath(lang, page),
  })),
  { hreflang: "x-default", href: origin + publicPath(DEFAULT_LANG, page) },
];

// What a public page puts in <head>. origin: APP_ORIGIN, the public origin of this app.
export function publicHead(origin, lang, page) {
  const { title, description } = dict(lang).pages[page];
  return {
    title: pageTitle(title),
    description,
    canonical: origin + publicPath(lang, page),
    alternates: alternates(origin, page),
    ogLocale: OG_LOCALE[lang],
  };
}

export function sitemapXml(origin) {
  const urls = PUBLIC_PAGES.flatMap((page) =>
    LANGS.map((lang) => {
      const links = alternates(origin, page).map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`,
      );
      return [
        "  <url>",
        `    <loc>${origin}${publicPath(lang, page)}</loc>`,
        ...links,
        "  </url>",
      ];
    }),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls.flat(),
    "</urlset>",
    "",
  ].join("\n");
}

export const robotsTxt = (origin) =>
  `User-agent: *\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
