import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4177,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:4178",
    },
  },
});
