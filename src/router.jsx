import { createBrowserRouter, Navigate } from "react-router";
import { PUBLIC_PAGES } from "./lib/seo.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { LegalPage } from "./pages/LegalPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  ...PUBLIC_PAGES.map((page) => ({
    path: `/${page}`,
    element: <LegalPage page={page} />,
  })),
  { path: "*", element: <NotFoundPage /> },
]);
