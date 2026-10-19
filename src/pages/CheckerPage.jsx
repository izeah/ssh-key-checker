import { useEffect, useRef, useState } from "react";
import { Rich } from "../components/atoms/Rich.jsx";
import { KeyField } from "../components/molecules/KeyField.jsx";
import { LegalDialog } from "../components/organisms/LegalDialog.jsx";
import { PairResult } from "../components/organisms/PairResult.jsx";
import { pageTitle } from "../lib/lang.js";
import { useLang } from "../lib/lang-context.jsx";
import {
  checkPair,
  MAX_CHARS,
  readPrivateKey,
  readPublicKey,
  samplePair,
} from "../lib/ssh-key.js";

// The modifier of the check shortcut: Cmd on Apple devices, Ctrl elsewhere (either one works).
const MOD = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd" : "Ctrl";
const FIELDS = ["private", "public"];
const READERS = { private: readPrivateKey, public: readPublicKey };
const EMPTY = { private: "privateEmpty", public: "publicEmpty" };

async function readFile(file) {
  if (file.size > MAX_CHARS) return { error: "tooBig" };
  try {
    const text = await file.text();
    // A key is text: NUL bytes or U+FFFD mean the file is binary.
    if (text.includes("\u0000") || text.includes("�"))
      return { error: "notText" };
    return { text };
  } catch {
    return { error: "fileUnreadable" };
  }
}

// The one page. Everything below runs in the browser: keys live in React state only, nothing is
// stored, and the CSP forbids any outgoing connection.
export function CheckerPage() {
  const { t } = useLang();
  const [texts, setTexts] = useState({ private: "", public: "" });
  const [reads, setReads] = useState({ private: null, public: null });
  const [fileErrors, setFileErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [sample, setSample] = useState(false);
  const [copied, setCopied] = useState(null);
  const [dialog, setDialog] = useState(null);
  const resultRef = useRef(null);

  // Live feedback while pasting: format and fingerprint only (the pair check waits for the button).
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      const [priv, pub] = await Promise.all(
        FIELDS.map((f) => READERS[f](texts[f])),
      );
      if (live)
        setReads({
          private: texts.private.trim() ? priv : null,
          public: texts.public.trim() ? pub : null,
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [texts]);

  // A file dropped beside the panes would make the browser open it: keep the page.
  useEffect(() => {
    const stop = (e) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [result]);

  function setText(field, value) {
    setTexts((prev) => ({ ...prev, [field]: value }));
    setFileErrors((prev) => ({ ...prev, [field]: undefined }));
    setResult(null);
    setSample(false);
  }

  async function putFile(field, file) {
    const r = await readFile(file);
    if (r.error) setFileErrors((prev) => ({ ...prev, [field]: r.error }));
    else setText(field, r.text);
  }

  async function takeFiles(field, files) {
    const list = [...files].slice(0, 2);
    if (list.length === 1) return putFile(field, list[0]);
    // Two files at once: each goes where its content says, not where it landed.
    const read = await Promise.all(list.map(readFile));
    for (const [i, r] of read.entries()) {
      if (r.error) setFileErrors((prev) => ({ ...prev, [FIELDS[i]]: r.error }));
      else
        setText(
          /PRIVATE KEY|PuTTY-User-Key-File/.test(r.text) ? "private" : "public",
          r.text,
        );
    }
  }

  async function check(e) {
    e.preventDefault();
    setSubmitted(true);
    setPending(true);
    setResult(null);
    const [priv, pub] = await Promise.all(
      FIELDS.map((f) => READERS[f](texts[f])),
    );
    const blank = FIELDS.find((f) => !texts[f].trim());
    setReads({
      private: texts.private.trim() ? priv : null,
      public: texts.public.trim() ? pub : null,
    });
    const invalid = FIELDS.find(
      (f) => fileErrors[f] || !(f === "private" ? priv : pub).ok,
    );
    if (blank || invalid) {
      setResult({ status: "blocked" });
      document.getElementById(`key-${blank ?? invalid}`)?.focus();
    } else {
      setResult(await checkPair(priv.key, pub.key));
    }
    setPending(false);
  }

  function clearBoth() {
    setTexts({ private: "", public: "" });
    setReads({ private: null, public: null });
    setFileErrors({});
    setSubmitted(false);
    setResult(null);
    setSample(false);
  }

  async function fillSample() {
    const s = await samplePair();
    if (!s.ok) return setResult({ status: s.error });
    setTexts({ private: s.privateText, public: s.publicText });
    setFileErrors({});
    setSubmitted(false);
    setResult(null);
    setSample(true);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  const errorOf = (field) =>
    fileErrors[field] ??
    (texts[field].trim()
      ? reads[field]?.error
      : submitted
        ? EMPTY[field]
        : undefined);
  const swappable =
    reads.private?.error === "privateIsPublic" ||
    reads.public?.error === "publicIsPrivate";
  const status = result?.status;
  const sign =
    status === "match" || status === "publicPartMatch"
      ? "="
      : status === "mismatch" || status === "typeMismatch"
        ? "≠"
        : "≟";

  const pane = (field) => (
    <KeyField
      field={field}
      t={t}
      value={texts[field]}
      onChange={(v) => setText(field, v)}
      onFiles={(files) => takeFiles(field, files)}
      onClear={() => setText(field, "")}
      read={reads[field]}
      error={errorOf(field)}
    />
  );

  return (
    <main className="page">
      <title>{pageTitle(t.meta.title)}</title>
      <section className="hero">
        <p className="motif" aria-hidden="true">
          id_ed25519 <span>≟</span> id_ed25519.pub
        </p>
        <h1>{t.hero.title}</h1>
        <p className="lede">{t.hero.lede}</p>
        <p className="proof">{t.hero.proof}</p>
      </section>

      <form
        className="tool"
        onSubmit={check}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (!pending) e.currentTarget.requestSubmit();
          }
        }}
        noValidate
        aria-busy={pending}
      >
        {pane("private")}
        <div className="seam" aria-hidden="true">
          <span key={sign}>{sign}</span>
        </div>
        {pane("public")}
        <div className="actions">
          <span className="primary-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending}
              aria-keyshortcuts="Control+Enter Meta+Enter"
            >
              {pending ? t.actions.checking : t.actions.check}
            </button>
            <span className="shortcut" aria-hidden="true">
              <kbd>{MOD}</kbd>
              <kbd>Enter</kbd>
            </span>
          </span>
          {swappable && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setTexts((p) => ({ private: p.public, public: p.private }));
                setFileErrors({});
                setResult(null);
              }}
            >
              {t.actions.swap}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={fillSample}>
            {t.actions.sample}
          </button>
          <button type="button" className="btn btn-quiet" onClick={clearBoth}>
            {t.actions.clearBoth}
          </button>
        </div>
        {sample && <p className="muted sample-note">{t.sample.note}</p>}
      </form>

      <div
        ref={resultRef}
        className="result-wrap"
        role="status"
        aria-live="polite"
      >
        <PairResult
          key={status ?? "idle"}
          result={result}
          t={t}
          copied={copied}
          onCopy={copy}
        />
      </div>
      <p className="tip muted">
        <Rich text={t.file.tip} />
      </p>

      <section className="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">{t.faq.title}</h2>
        {t.faq.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>
              <Rich text={item.a} />
            </p>
          </details>
        ))}
      </section>

      <footer className="foot">
        <p className="muted foot-note">{t.footer.line}</p>
        <div className="foot-links">
          <button
            type="button"
            className="link"
            onClick={() => setDialog("terms")}
          >
            {t.footer.terms}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => setDialog("privacy")}
          >
            {t.footer.privacy}
          </button>
        </div>
      </footer>
      {dialog && (
        <LegalDialog kind={dialog} t={t} onClose={() => setDialog(null)} />
      )}
    </main>
  );
}
