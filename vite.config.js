import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vite";
import { sharedConfig } from "./vite.shared.js";

export default defineConfig(() =>
  mergeConfig(sharedConfig(), { plugins: [react()] }),
);
