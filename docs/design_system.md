# Design System — Ssh Key Checker

> [!IMPORTANT]
> `DESIGN.md` holds the **direction**: audience, feel, fonts, colors, tone, language. This file holds the
> **engineering rules** for building it here. Read both before any UI work. The tokens in `src/styles/globals.css`
> are a neutral scaffold, not a brand: shipping them unchanged is what AI slop looks like.

| Question | Source of truth |
|---|---|
| Who is it for, how should it look and sound, which fonts, colors and language; which pages exist and their kind | `DESIGN.md` (written by the developer; the agent records answers and never invents them) |
| How tokens, themes, languages, states, forms and page kinds are built | this file |
| What gets rejected | `make sast` (`.semgrep/antislop.yml`), then the antislop Delivery Gate |
| Why a choice was made | `docs/decisions.md` |

## 1. Workflow for UI work

1. `DESIGN.md` Status must be `APPROVED`. If it is not, stop and ask the Intent questions (`CLAUDE.md`, Rule 10).
2. The route is in `DESIGN.md` → Page inventory with its kind, **app** or **public** (section 13).
3. Build with tokens and native elements, every string in both dictionaries (sections 2 to 13).
4. `make sast`: fix every finding. A technique `DESIGN.md` explicitly asks for (a gradient, a blur) stays, with
   `nosemgrep: <rule-id> -- <reason taken from DESIGN.md>` on the line above it.
5. `make ui-shots`, then open the PNGs (375, 768 and 1280 px; light and dark; both languages) and look at them.
   Passing assertions is not looking.
6. Run the antislop Delivery Gate and the checklist of the page's kind (section 13), and report PASS or FAIL per
   item, with evidence.

## 2. Tokens

- Colors, sizes, radii and durations are CSS custom properties in `src/styles/globals.css`. Components use
  `var(--token)` and never a literal hex, rgb or pixel size. A new value is a new token, named by role (`--accent`),
  not by look (`--blue`).
- Palette: 2 to 3 core colors plus 1 accent (neutrals do not count). The accent marks the one primary action of a view.
- Spacing steps are multiples of 0.25rem (`--space-*`). Equal padding everywhere flattens the page: vary it to set
  the rhythm DESIGN.md asks for.
- Elevation: borders first; at most two shadow levels, each with a reason in DESIGN.md.
- Check every text and background pair of **both** themes with the antislop `check_contrast` tool before using it
  (4.5:1 normal text, 3:1 large text and UI boundaries such as input borders). Record the pairs in DESIGN.md.

## 3. Theme: light and dark with a toggle

- `<html data-theme="light|dark">` selects the token set. Without the attribute the OS preference
  (`prefers-color-scheme`) decides, so a first visit needs no choice. The toggle then stores `theme`, a functional
  cookie (one year, `SameSite=Lax`, no personal data).
- No inline script (CSP). The SSR frameworks (Next, Nuxt, SvelteKit) write the attribute on the server from the
  cookie, allowlisted to `light` or `dark` because it lands in HTML. The Vite SPAs load `public/theme.js` as a
  blocking script in `<head>`. Never replace this with an inline `<script>` or `'unsafe-inline'`.
- The toggle is one `<button class="theme-toggle" aria-pressed>` (`ThemeToggle`), mounted once in the root layout
  inside `.prefs` next to `LangToggle`, with a text label from the dictionaries (`theme.dark`; the e2e finds it by its
  class). No second control and no icon-only variant.
- UI work is done only after both themes were checked: contrast pairs for each, screenshots for each.

## 4. Components

- Native first: `<button>`, `<dialog>`, `<details>`, `<input type="date">`, `popover`. A UI library, icon set or motion
  library needs a reason in the plan and an ADR in `docs/decisions.md`. "Everyone uses it" is not a reason.
- Structure (atomic): `components/atoms` (Button, Badge), `molecules` (UserCard, SearchInput), `organisms`
  (DashboardSidebar, UserDataTable), then `…Layout` templates and `…Page` screens. One `PascalCase` file per component.
- Every interactive component has default, hover, active, `:focus-visible`, disabled and (when it submits) pending
  states. Never `outline: none` without a visible replacement.
- Icons only when they say something the label does not: inline SVG, relevant to the content, an accessible name on
  every icon-only control. No emoji as icons, no sparkle or robot glyphs.
- Radius, shadow and weight follow hierarchy. Not everything is a card, not everything is a pill.

## 5. States and copy

- A view that loads data has loading, empty and error states, and they differ by cause (first run, filtered to
  nothing, no permission, request failed).
  - Loading says what is loading ("Loading your profile…") and keeps the layout stable.
  - Empty says why it is empty and offers the one action that fills it.
  - Error says what failed and what to do next. Never "Something went wrong", never a raw error object.
- Buttons name the action ("Create invoice", "Save changes"). The same word means the same thing everywhere (keep the
  glossary in DESIGN.md). Sentence case, no em dash, no emoji, no buzzwords, no filler greetings or exclamations.
- Language: section 12. One register per language, no mixed languages on a screen (data from the API excepted).
- Nothing invented: no placeholder statistics, testimonials, logos, people or activity feeds. Show real data, an
  honest empty state, or `[REAL DATA]` in a draft. No "Forgot password", "Sign up", "Remember me" or social login until
  the API has the endpoint behind it.

## 6. Forms

- Native `<form>` and `FormData`. The BFF or API validates with zod; browser constraints are a convenience.
- Each field has a visible `<label>` and the right `type`, `autocomplete` and `inputmode`. A placeholder is never the
  label.
- The error sits next to its field, is linked with `aria-describedby`, says how to fix it and keeps what the user
  typed. One live region carries form-level errors.
- The submit button names the action and is disabled while pending.

## 7. Layout and responsive

- Mobile first. Verify 375, 768 and 1280 px: no horizontal scroll, no text outside its box. Use `dvh`, never `100vh`.
- Tap targets are at least 44 px and nothing depends on hover.
- Grid for the page, flex inside components. One focal point per screen; whitespace is structure, so group what
  belongs together and separate what does not.
- Build each screen from the decision the user makes on it, not from the landing-page or dashboard template (hero and
  three cards; sidebar, four stat cards, chart and table).

## 8. Typography

- Fonts are self-hosted: no request to a font CDN (privacy, and CSP `font-src 'self'`). Pairing and reason live in
  DESIGN.md. Use `font-display: swap` and a fallback close in metrics (`size-adjust`) so the page does not shift.
- Sizes come from the `--text-*` scale. Prose lines stay under about 75ch. Headings use `text-wrap: balance`,
  paragraphs `pretty`. Numbers in tables and stats use `font-variant-numeric: tabular-nums`.
- Hierarchy needs size, weight and color to differ together. Heading levels never skip.

## 9. Motion

- Motion shows a state change or points at something. If you cannot say which, delete it. Transitions on `opacity` and
  `transform`, 120 to 200 ms; never `transition: all`; no hover lift or scale on every card.
- Nothing loops except a loading indicator. No scroll-reveal or entrance animation by default; page choreography only
  when the MOTION dial in DESIGN.md is 2 or 3, with the purpose written down.
- CSS first (transitions, `@starting-style`, View Transitions). A motion library needs a plan and an ADR.
- `prefers-reduced-motion: reduce` is honored by the global block in `globals.css`. Keep it.

## 10. Data display

- Choose table columns from the decision the user makes in that table: the deciding field comes first, numbers are
  right-aligned, and every row action exists.
- A chart answers one question, written as its title ("Failed jobs per hour, last 24h"). Label directly, never rely
  on color alone, keep 3:1 between neighbours. If one sentence answers the question, write the sentence.

## 11. Accessibility baseline

- Landmarks (`header`, `nav`, `main`, `footer`), one `h1`, a skip link when there is a nav.
- Everything works by keyboard in visual order with a visible focus; 200% zoom loses nothing; decorative images have
  an empty `alt`; no information is carried by color alone; WCAG AA contrast in both themes.

## 12. Language: Indonesian and English

- Every visible string comes from `src/i18n/id` and `src/i18n/en` through `useLang()`:
  headings, labels, buttons, `<title>`, `aria-label`, alt text, errors. No literal text in a component. A new string is
  a new key in **both** files; `src/lib/lang.test` fail when one is missing.
- Not translated: data from the API (user names, `roles.name`, anything a user typed or an admin edited) and the
  values in form fields.
- `LangToggle` is an inline `<nav class="lang">` with a globe icon: the language showing is plain text (`aria-current`), the
  other language is one `<button class="lang-toggle">` styled as a link, its `lang` attribute set so a screen reader
  pronounces it right. It sits next to `ThemeToggle` on every screen, the not-found and error screens included. (Changed
  from a single toggle button on the developer's request, 2026-10-19.)
- A switch re-renders in place: no navigation and no reload, so a form keeps what the user typed. It writes the `lang`
  cookie (functional, one year) and `<html lang>`, which always matches what is shown. The server reads the cookie,
  allowlisted to `id` or `en`; without it `DEFAULT_LANG` decides, never `Accept-Language` (many browsers in Indonesia
  send English first).
- Every page sets its own `<title>` with `pageTitle(...)`: what the page is, then the product. It is the only one:
  no default title in a layout or in `index.html` (React puts the page's `<title>` in `<head>` after it). The first `<title>` in the document
  wins, so a second one hides the page's own; `make ui-shots` fails on it.
- Errors are kept as keys (`LoginError`), never as text, so an error already on screen follows a switch. Never show
  an API `message` to the user: map the status to a key (`loginError`).
- Write each language natively, in the register DESIGN.md gives it; no word-for-word translation. Indonesian strings
  run longer: check both languages in `make ui-shots`.
- Numbers, dates and currency go through `Intl` with the locale DESIGN.md gives for the current language, never by
  hand.
- A third language means a new dictionary, the `Lang` union and allowlist, and a list instead of a two-way toggle: a
  plan and an ADR first.

## 13. Page kinds: app or public

Every route is in `DESIGN.md` → Page inventory with its kind before it is built, and passes that kind's checklist
before the task is reported done.

| Check | App (behind sign-in, tools, sign-in itself) | Public (landing, company profile, legal) |
|---|---|---|
| Indexing | `noindex` (meta or `X-Robots-Tag`), never in the sitemap. `robots.txt` does not hide a page: a `Disallow` stops crawlers from reading its `noindex` | indexable, with a canonical URL, listed in `sitemap.xml` |
| `<title>` | unique per page, in both languages (WCAG 2.4.2) | the same, written for the search result |
| Meta description | not needed | one per page and language, written for that page (about 150 characters) |
| `robots.txt` | one for the site: allows the public pages, disallows `/api/`, names the sitemap | same file |
| Language | `lang` cookie, switched in place | in the URL (`/id/...`, `/en/...`), `hreflang` alternates both ways plus `x-default`; the switch is a link to the same page in the other language |
| Images | `alt` on every image (`alt=""` when decorative) | the same; the text says what the image shows, not keywords |
| Primary action | visible without scrolling on its screen | the page's one call to action above the fold at 375 px. A sticky mobile CTA only when the page has a single conversion goal, and it never covers the focused element (WCAG 2.4.11), content or the cookie notice |
| States | loading, empty (says why, offers the action), error by cause, form errors next to the field | the same for every form and data block |
| Legal | privacy policy and terms linked from sign-in once accounts exist | privacy policy and terms pages in both languages. Their text comes from the developer or legal, never from the agent; a draft says `[REAL DATA]` |

This template is a Vite SPA: it renders meta tags with JavaScript, which social previews and many crawlers never
run, so it has **no public page**. `index.html` says `noindex` on every route, `public/robots.txt` lets crawlers read
that, and the legal pages (`/privacy`, `/terms`, from `PUBLIC_PAGES` in `src/lib/seo`) follow the `lang` cookie like
every other screen. A page that must rank or show a social preview belongs in a Next, Nuxt or SvelteKit project.

## 14. Gap checklist

The lint catches the mechanical tells and the Delivery Gate covers honesty, function, states, keyboard and contrast.
These are what neither catches. Each one must be true before UI work is reported done.

- [ ] DESIGN.md is `APPROVED` and the scaffold tokens (zinc, blue, `system-ui`) were replaced, or DESIGN.md records
      why they stay
- [ ] The hierarchy is real: display, heading, body and caption differ in size **and** weight, and the primary action
      is the single accent
- [ ] Prose lines are at most about 75ch, `text-wrap` is set, numbers use `tabular-nums`
- [ ] The route is in DESIGN.md → Page inventory and passes its kind's checklist (section 13)
- [ ] Every new string is a key in both dictionaries, written natively in each register; `<html lang>`, `<title>`
      and `Intl` follow a switch, and a switch keeps what the user typed
- [ ] Icons are there for meaning, not rhythm: no icon on every button or heading
- [ ] Confirmations name the consequence ("Delete 3 invoices? This cannot be undone"), not "Are you sure?"
- [ ] No new UI library, icon set or motion library without a plan and an ADR
- [ ] The theme and language choices survive a reload, and both themes and both languages look right in the
      screenshots
