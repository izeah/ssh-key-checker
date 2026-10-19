// UI language, server-safe half (no DOM; the browser half is lang-client). The choice is the
// `lang` cookie (functional, no personal data); without it DEFAULT_LANG decides. Strings live in
// src/i18n/<lang>.
import { en } from "../i18n/en.js";
import { id } from "../i18n/id.js";

export const LANGS = ["id", "en"];

// The language of a first visit. Not the browser's Accept-Language: many browsers in Indonesia
// send English first. Recorded in DESIGN.md → Language (the SPAs repeat it in index.html's <html lang>).
export const DEFAULT_LANG = "id";

const DICTS = { id, en };

export const dict = (lang) => DICTS[lang];

// LangToggle offers the language that is not showing.
export const otherLang = (lang) => (lang === "id" ? "en" : "id");

// Every page's <title>: what the page is, then the product.
export const pageTitle = (page) => `${page} · Ssh Key Checker`;

// Only these two values may reach the page: the cookie lands in an HTML attribute.
export function langFrom(value) {
  return value === "id" || value === "en" ? value : undefined;
}

// The language out of a raw Cookie header, or out of document.cookie (same format).
export function langFromCookieHeader(header) {
  const found = header?.split("; ").find((c) => c.startsWith("lang="));
  return langFrom(found?.slice("lang=".length));
}

// A failed sign-in as a key of login.errors, not as text: an error already on screen then
// follows a language switch. status: the ApiError status, undefined when the server was not reached.

export function loginError(status) {
  if (status === undefined) return "offline";
  if (status === 401) return "invalidCredentials";
  if (status === 429) return "tooManyAttempts";
  return "failed";
}
