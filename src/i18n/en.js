// English UI strings. id must have the same keys (the type check and src/lib/lang.test enforce
// it). Only interface text lives here: data from the API (names, role names) is shown as it is.
export const en = {
  // The name of this language, written in it (LangToggle shows the language it switches to).
  langName: "English",
  theme: {
    dark: "Dark mode",
  },
  login: {
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in…",
    errors: {
      invalidCredentials: "Email or password is incorrect.",
      tooManyAttempts: "Too many attempts. Wait a moment, then try again.",
      failed: "Could not sign in right now. Try again in a moment.",
      offline:
        "Could not reach the server. Check your connection and try again.",
    },
  },
  dashboard: {
    title: "Dashboard",
    loading: "Loading your profile…",
    loadFailed: "Could not load your profile. Try again later.",
    name: "Name",
    email: "Email",
    roles: "Roles",
    signOut: "Sign out",
    signOutFailed: "Could not sign out. Check your connection and try again.",
  },
  notFound: {
    title: "Page not found",
    home: "Go to the dashboard",
  },
  // Public pages (src/lib/seo PUBLIC_PAGES): the title and the meta description of each.
  pages: {
    privacy: {
      title: "Privacy policy",
      description: "What personal data Ssh Key Checker processes and why.",
    },
    terms: {
      title: "Terms of use",
      description: "The terms for using Ssh Key Checker.",
    },
  },
  legal: {
    draft:
      "[REAL DATA] This page needs its real text from you or your legal adviser. The agent does not write it.",
  },
  error: {
    title: (status) => `This page could not be loaded (error ${status})`,
  },
};
