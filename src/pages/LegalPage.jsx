import { pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";

// The legal pages (src/lib/seo PUBLIC_PAGES). This SPA has no indexable page (index.html says
// noindex), so they follow the lang cookie like every other screen; pages that must rank belong in
// Next, Nuxt or SvelteKit.
export function LegalPage({ page }) {
  const { t } = useLang();
  return (
    <main className="card stack prose">
      <title>{pageTitle(t.pages[page].title)}</title>
      <h1>{t.pages[page].title}</h1>
      <p>{t.legal.draft}</p>
    </main>
  );
}
