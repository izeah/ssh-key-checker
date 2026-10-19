import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { LangToggle } from "./components/atoms/LangToggle.jsx";
import { ThemeToggle } from "./components/atoms/ThemeToggle.jsx";
import { currentLang } from "./lib/lang-client.js";
import { LangProvider } from "./lib/lang-context.jsx";
import { router } from "./router.jsx";
import "./styles/globals.css";

const queryClient = new QueryClient();
const root = document.getElementById("root");
if (!root) throw new Error("#root missing in index.html");

// The lang cookie decides (else DEFAULT_LANG); index.html only covers the moment before this runs.
const lang = currentLang();
document.documentElement.lang = lang;

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangProvider initial={lang}>
        <div className="prefs">
          <LangToggle />
          <ThemeToggle />
        </div>
        <RouterProvider router={router} />
      </LangProvider>
    </QueryClientProvider>
  </StrictMode>,
);
