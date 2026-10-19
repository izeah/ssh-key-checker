import { useState } from "react";
import { useLang } from "../../lib/lang-context.jsx";
import { currentTheme, setTheme } from "../../lib/theme.js";

const ICON = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
};

// One icon button: a moon while the page is light (press for dark), a sun while it is dark. The
// state lives in aria-pressed and the name in aria-label, so the icon is only decoration.
// public/theme.js ran before React, so the attribute is already right when this renders.
export function ThemeToggle() {
  const { t } = useLang();
  const [dark, setDark] = useState(() => currentTheme() === "dark");

  function toggle() {
    const next = dark ? "light" : "dark";
    setTheme(next);
    setDark(next === "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      aria-label={t.theme.dark}
      title={t.theme.dark}
      onClick={toggle}
    >
      {dark ? (
        <svg {...ICON} aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg {...ICON} aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
        </svg>
      )}
    </button>
  );
}
