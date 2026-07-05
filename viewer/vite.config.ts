/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare Pages serves the site at the domain root (kip-knowledge-base.pages.dev),
// so base is "/" everywhere — no repo-name subpath like GitHub Pages needed.
export default defineConfig({
  base: "/",
  plugins: [react()],
  test: { environment: "node" },
});
