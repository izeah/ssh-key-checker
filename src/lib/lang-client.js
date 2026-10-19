// UI language, browser half (uses the DOM; the server-safe half is lang).
import { DEFAULT_LANG, langFromCookieHeader } from "./lang.js";

// The language chosen in this browser, else DEFAULT_LANG.
export function currentLang() {
  return langFromCookieHeader(document.cookie) ?? DEFAULT_LANG;
}

// Marks the page with the choice now and keeps it for a year. The caller re-renders its strings
// in place (no navigation), so a form keeps what the user typed.
export function setLang(lang) {
  document.documentElement.lang = lang;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a functional preference that JS must write; the Cookie Store API is not in every browser
  document.cookie = `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
