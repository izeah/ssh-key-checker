import { createContext, useContext, useState } from "react";
import { dict } from "./lang.js";
import { setLang } from "./lang-client.js";

const LangContext = createContext(undefined);

// Holds the UI language for every component below it. main.tsx passes the cookie's choice as
// `initial`, so the first render is already in the right language. A switch re-renders in
// place: no navigation, so a form keeps what the user typed.
export function LangProvider({ initial, children }) {
  const [lang, setState] = useState(initial);
  function switchTo(next) {
    setLang(next);
    setState(next);
  }
  const value = { lang, t: dict(lang), switchTo }; // a variable: double braces would be a Go template tag
  return <LangContext value={value}>{children}</LangContext>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang needs a <LangProvider> above it");
  return value;
}
