import { useEffect, useRef } from "react";
import { Rich } from "../atoms/Rich.jsx";

// Terms and Privacy as a native <dialog>: a side sheet on wide screens, a bottom sheet on phones.
// showModal gives Escape, a focus trap and focus back to the button that opened it.
export function LegalDialog({ kind, t, onClose }) {
  const ref = useRef(null);
  const doc = t.legal[kind];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a backdrop click is a pointer shortcut; Escape and the Close button do the same by keyboard
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        // The backdrop is part of the dialog element; the content sits in .sheet-body.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="sheet-title">{doc.title}</h2>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => ref.current?.close()}
          >
            {t.legal.close}
          </button>
        </div>
        <p className="draft">
          <Rich text={t.legal.draft} />
        </p>
        {doc.sections.map((section) => (
          <section key={section.h}>
            <h3>{section.h}</h3>
            {section.p.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}
