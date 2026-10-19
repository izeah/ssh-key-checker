import { pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";

export function NotFoundPage() {
  const { t } = useLang();
  return (
    <main className="page missing">
      <title>{pageTitle(t.notFound.title)}</title>
      {/* index.html says index; with two robots tags the stricter wins, so this screen is never indexed. */}
      <meta name="robots" content="noindex" />
      <h1>{t.notFound.title}</h1>
      <p className="back">
        <a href="/">{t.notFound.home}</a>
      </p>
    </main>
  );
}
