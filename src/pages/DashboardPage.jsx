import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, api, logout } from "../lib/auth.js";
import { pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";

// A protected page: api() attaches the in-memory access token and refreshes it on 401.
// Profile values and role names are data from the API: shown as they are, never translated.
export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();
  const [signOutFailed, setSignOutFailed] = useState(false);
  const me = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api("/v1/users/me"),
    retry: false,
  });
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (unauthorized) navigate("/login", { replace: true });
  }, [unauthorized, navigate]);

  async function signOut() {
    try {
      await logout();
    } catch {
      // The session may still be alive on the server: say so instead of pretending.
      setSignOutFailed(true);
      return;
    }
    queryClient.clear(); // no cached profile for the next user of this browser
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <title>{pageTitle(t.dashboard.title)}</title>
      <section className="card stack" aria-busy={me.isPending}>
        <h1>{t.dashboard.title}</h1>
        {me.isPending && <p>{t.dashboard.loading}</p>}
        {me.isError && !unauthorized && (
          <p className="error" role="alert">
            {t.dashboard.loadFailed}
          </p>
        )}
        {me.data && (
          <dl className="profile">
            <dt>{t.dashboard.name}</dt>
            <dd>{me.data.name}</dd>
            <dt>{t.dashboard.email}</dt>
            <dd>{me.data.email}</dd>
            <dt>{t.dashboard.roles}</dt>
            <dd>{me.data.roles.map((r) => r.name).join(", ")}</dd>
          </dl>
        )}
        {signOutFailed && (
          <p className="error" role="alert">
            {t.dashboard.signOutFailed}
          </p>
        )}
        <button type="button" onClick={signOut}>
          {t.dashboard.signOut}
        </button>
      </section>
    </main>
  );
}
