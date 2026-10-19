import { Rich } from "../atoms/Rich.jsx";

const FAILED = ["damaged", "noEd25519", "refused"];

// Every answer the checker can give. Colour never carries it alone: each state has its own
// heading text and sign.
export function PairResult({ result, t, copied, onCopy }) {
  const r = t.result;
  if (!result) {
    return (
      <div className="result" data-status="idle">
        <p className="result-kicker">{r.title}</p>
        <p className="muted">{r.idle}</p>
      </div>
    );
  }
  const { status } = result;
  if (status === "blocked") {
    return (
      <div className="result" data-status="blocked">
        <p className="result-kicker">{r.title}</p>
        <p className="result-body">{r.blocked}</p>
      </div>
    );
  }

  const copy = (fingerprint) => (
    <>
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => onCopy(fingerprint)}
      >
        {copied === "ok" ? r.copied : r.copy}
      </button>
      <span className="sr-only" role="status">
        {copied === "ok" ? r.copied : copied === "fail" ? r.copyFailed : ""}
      </span>
      {copied === "fail" && <span className="muted">{r.copyFailed}</span>}
    </>
  );

  const isMatch = status === "match" || status === "publicPartMatch";
  const copy_ =
    status === "match"
      ? r.match
      : status === "publicPartMatch"
        ? r.publicPart
        : r[status];
  const body =
    typeof copy_.body === "function"
      ? copy_.body(result.privateType, result.publicType)
      : copy_.body;
  const sign = isMatch
    ? "="
    : status === "mismatch" || status === "typeMismatch"
      ? "≠"
      : null;

  return (
    <div
      className="result"
      data-status={FAILED.includes(status) ? "failed" : status}
    >
      <p className="result-kicker">{r.title}</p>
      <h2 className="result-title">
        {sign && (
          <span className="sign" aria-hidden="true">
            {sign}
          </span>
        )}
        {copy_.title}
      </h2>
      <p className="result-body">
        <Rich text={body} />
      </p>
      {status === "match" && (
        <dl className="facts">
          <dt>{r.type}</dt>
          <dd>
            {result.publicType}, {result.bits} bit
          </dd>
          {result.comment && (
            <>
              <dt>{r.comment}</dt>
              <dd>
                <code>{result.comment}</code>
              </dd>
            </>
          )}
          <dt>{r.fingerprint}</dt>
          <dd>
            <code className="fp">{result.publicFingerprint}</code>
            <span className="fp-actions">{copy(result.publicFingerprint)}</span>
          </dd>
        </dl>
      )}
      {status === "match" && (
        <p className="muted">
          <Rich text={r.match.note} />
        </p>
      )}
      {status === "match" && result.weakRsa && (
        <p className="result-body">
          <Rich text={r.weakRsa} />
        </p>
      )}
      {status === "publicPartMatch" && (
        <dl className="facts">
          <dt>{r.fingerprint}</dt>
          <dd>
            <code className="fp">{result.publicFingerprint}</code>
            <span className="fp-actions">{copy(result.publicFingerprint)}</span>
          </dd>
        </dl>
      )}
      {status === "mismatch" && (
        <dl className="facts">
          <dt>{r.privateFingerprint}</dt>
          <dd>
            <code className="fp">{result.privateFingerprint}</code>
          </dd>
          <dt>{r.publicFingerprint}</dt>
          <dd>
            <code className="fp">{result.publicFingerprint}</code>
          </dd>
        </dl>
      )}
    </div>
  );
}
