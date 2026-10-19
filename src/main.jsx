import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LangToggle } from "./components/atoms/LangToggle.jsx";
import { ThemeToggle } from "./components/atoms/ThemeToggle.jsx";
import { currentLang } from "./lib/lang-client.js";
import { LangProvider } from "./lib/lang-context.jsx";
import { CheckerPage } from "./pages/CheckerPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing in index.html");

// The lang cookie decides (else DEFAULT_LANG); index.html only covers the moment before this runs.
const lang = currentLang();
document.documentElement.lang = lang;

// One page at "/"; any other path is the not-found screen. No router: nothing else to route to.
const Page = location.pathname === "/" ? CheckerPage : NotFoundPage;

createRoot(root).render(
  <StrictMode>
    <LangProvider initial={lang}>
      <header className="top">
        <a className="brand" href="/">
          SSH Key Checker
        </a>
        <div className="prefs">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>
      <Page />
    </LangProvider>
  </StrictMode>,
);
