import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@domain": fileURLToPath(
        new URL("../backend/src/domain.ts", import.meta.url),
      ),
    },
  },
  server: {
    // Windows editors can emit change while a stylesheet is temporarily empty.
    watch: { awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 } },
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": process.env.API_TARGET || "http://127.0.0.1:5000",
      "/health": process.env.API_TARGET || "http://127.0.0.1:5000",
    },
  },
});
