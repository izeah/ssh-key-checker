import { dict, otherLang } from "../../lib/lang.js";
import { useLang } from "../../lib/lang-context.jsx";

// Inline language switch: the language showing is plain text, the other one is the link. The lang
// attribute makes a screen reader pronounce each name right. Mounted once in main.jsx, next to ThemeToggle.
export function LangToggle() {
  const { lang, t, switchTo } = useLang();
  const next = otherLang(lang);
  return (
    <nav className="lang" aria-label={t.langNav}>
      <svg
        className="lang-icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.500 18.400 12 21c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z" />
      </svg>
      <span lang={lang} aria-current="true">
        {dict(lang).langName}
      </span>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className="lang-toggle"
        lang={next}
        onClick={() => switchTo(next)}
      >
        {dict(next).langName}
      </button>
    </nav>
  );
}
