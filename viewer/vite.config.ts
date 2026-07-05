/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site under /<repo>/ in production; local dev uses /.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/kip-knowledge-base/" : "/",
  plugins: [react()],
  test: { environment: "node" },
}));
