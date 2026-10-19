import { expect, test } from "vitest";
import { en } from "../i18n/en.js";
import { id } from "../i18n/id.js";
import { langFrom, langFromCookieHeader, loginError } from "./lang.js";

test("only id and en pass, since the value ends up in HTML", () => {
  expect(langFrom("id")).toBe("id");
  expect(langFrom("en")).toBe("en");
  for (const bad of [
    undefined,
    null,
    "",
    "ID",
    "en-US",
    "fr",
    '"><script>alert(1)</script>',
  ]) {
    expect(langFrom(bad)).toBeUndefined();
  }
});

test("reads only the lang cookie out of a Cookie header", () => {
  expect(langFromCookieHeader("a=1; lang=en; b=2")).toBe("en");
  expect(langFromCookieHeader("lang=id")).toBe("id");
  expect(langFromCookieHeader("mylang=en")).toBeUndefined();
  expect(langFromCookieHeader('lang="><script>')).toBeUndefined();
  expect(langFromCookieHeader(undefined)).toBeUndefined();
});

// A JavaScript project has no type check, so this is what keeps the two dictionaries in step.
test("both dictionaries have the same keys and no empty string", () => {
  const shape = (o) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => [
        k,
        typeof v === "object" ? shape(v) : typeof v,
      ]),
    );
  expect(shape(id)).toEqual(shape(en));

  const strings = (o) =>
    Object.values(o).flatMap((v) => (typeof v === "object" ? strings(v) : [v]));
  for (const s of [...strings(en), ...strings(id)]) {
    if (typeof s === "string") expect(s.trim()).not.toBe("");
  }
});

test("a failed sign-in becomes a message key", () => {
  expect(loginError(401)).toBe("invalidCredentials");
  expect(loginError(429)).toBe("tooManyAttempts");
  expect(loginError(400)).toBe("failed");
  expect(loginError(502)).toBe("failed");
  expect(loginError(undefined)).toBe("offline");
});
