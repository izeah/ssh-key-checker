import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, login } from "../lib/auth.js";
import { loginError, pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";

// Native form, labelled fields, one error region announced to screen readers. The error is a
// key, so it follows a language switch; what the user typed stays.
export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [error, setError] = useState();
  const [pending, setPending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(loginError(err instanceof ApiError ? err.status : undefined));
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <title>{pageTitle(t.login.title)}</title>
      <form className="card stack" onSubmit={submit}>
        <h1>{t.login.title}</h1>
        <label className="field">
          <span>{t.login.email}</span>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label className="field">
          <span>{t.login.password}</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={72}
            required
          />
        </label>
        <p className="error" role="alert" aria-live="polite">
          {error && t.login.errors[error]}
        </p>
        <button type="submit" disabled={pending}>
          {pending ? t.login.pending : t.login.submit}
        </button>
        <p className="legal">
          <Link to="/privacy">{t.pages.privacy.title}</Link>
          <Link to="/terms">{t.pages.terms.title}</Link>
        </p>
      </form>
    </main>
  );
}
