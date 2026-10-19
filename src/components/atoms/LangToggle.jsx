import { dict, otherLang } from "../../lib/lang.js";
import { useLang } from "../../lib/lang-context.jsx";

// One button that names the other language in that language; the lang attribute makes a screen
// reader pronounce it right. Mounted once in main.tsx, next to ThemeToggle.
export function LangToggle() {
  const { lang, switchTo } = useLang();
  const next = otherLang(lang);
  return (
    <button
      type="button"
      className="lang-toggle"
      lang={next}
      onClick={() => switchTo(next)}
    >
      {dict(next).langName}
    </button>
  );
}
