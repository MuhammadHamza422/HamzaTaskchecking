import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    host: true,  // allow external access
    allowedHosts: [
      "overscented-linn-nondeflationary.ngrok-free.dev"
    ],
    port: 5173
  }
});
