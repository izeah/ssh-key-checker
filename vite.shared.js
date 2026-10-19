// Shared by vite.config.js: a strict CSP <meta> injected into the production build. The page never
// talks to a server after it loads, so connect-src and form-action are 'none': even injected code
// could not send a key anywhere.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function sharedConfig() {
  return {
    plugins: [cspMeta()],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    // Fonts stay files under /assets: font-src 'self' does not allow data: URLs.
    build: { assetsInlineLimit: 0 },
  };
}

function cspMeta() {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
        injectTo: "head-prepend",
      },
    ],
  };
}
