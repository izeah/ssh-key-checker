import { Link } from "react-router";
import { pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";

export function NotFoundPage() {
  const { t } = useLang();
  return (
    <main className="card stack">
      <title>{pageTitle(t.notFound.title)}</title>
      <h1>{t.notFound.title}</h1>
      <p>
        <Link to="/dashboard">{t.notFound.home}</Link>
      </p>
    </main>
  );
}
