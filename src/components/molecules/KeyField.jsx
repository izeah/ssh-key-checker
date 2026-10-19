import { useRef, useState } from "react";
import { normalizePaste } from "../../lib/ssh-key.js";
import { Rich } from "../atoms/Rich.jsx";

const PLACEHOLDER = {
  private:
    "-----BEGIN OPENSSH PRIVATE KEY-----\n…\n-----END OPENSSH PRIVATE KEY-----",
  public: "ssh-ed25519 AAAA… you@laptop",
};

// One pane: a labelled textarea, a file row (choose or drop) and a status line that either says
// what was read or what is wrong and how to fix it. The error is a dictionary key, so it follows a
// language switch.
export function KeyField({
  field,
  t,
  value,
  onChange,
  onFiles,
  onClear,
  read,
  error,
}) {
  const id = `key-${field}`;
  const fileInput = useRef(null);
  const [over, setOver] = useState(false);
  const key = !error && read?.ok ? read.key : null;

  function pick(e) {
    onFiles(e.target.files);
    e.target.value = ""; // choosing the same file again must fire again
  }
  // A key pasted with literal "\n" (env var, JSON, shell history) becomes real lines right away.
  function paste(e) {
    const pasted = e.clipboardData.getData("text");
    const fixed = normalizePaste(pasted);
    if (fixed === pasted) return;
    e.preventDefault();
    const el = e.currentTarget;
    const at = el.selectionStart;
    onChange(value.slice(0, at) + fixed + value.slice(el.selectionEnd));
    requestAnimationFrame(() =>
      el.setSelectionRange(at + fixed.length, at + fixed.length),
    );
  }
  function drop(e) {
    e.preventDefault();
    setOver(false);
    onFiles(e.dataTransfer.files);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dropping is a shortcut; "Choose file" does the same by keyboard
    <div
      className="pane"
      data-over={over || undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false);
      }}
      onDrop={drop}
    >
      <label htmlFor={id} className="pane-label">
        {t.fields[field].label}
      </label>
      <p id={`${id}-hint`} className="hint">
        <Rich text={t.fields[field].hint} />
      </p>
      <textarea
        id={id}
        className="key-input"
        rows={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={paste}
        placeholder={PLACEHOLDER[field]}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={`${id}-hint ${id}-status`}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        data-enable-grammarly="false"
        data-1p-ignore
        data-lpignore="true"
      />
      <div className="file-row">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => fileInput.current?.click()}
        >
          {t.file.choose}
        </button>
        <span className="muted">{over ? t.file.dropping : t.file.drop}</span>
        {value && (
          <button
            type="button"
            className="btn btn-quiet push"
            onClick={onClear}
          >
            {t.file.clear}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          hidden
          tabIndex={-1}
          onChange={pick}
        />
      </div>
      <p
        id={`${id}-status`}
        className="status"
        data-state={error ? "error" : key ? "ok" : "idle"}
        aria-live="polite"
      >
        {error && <Rich text={t.errors[error] ?? t.errors.privateDamaged} />}
        {key && (
          <>
            {t.status.read(key.typeLabel, key.bits)}
            {key.comment && (
              <>
                {t.status.comment} <code>{key.comment}</code>
              </>
            )}
            {key.encrypted && (
              <span className="status-extra">{t.status.locked}</span>
            )}
          </>
        )}
      </p>
    </div>
  );
}
