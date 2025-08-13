import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: path.resolve(__dirname, "postcss.config.js"),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          html2canvas: ["html2canvas"],
          jsqr: ["jsqr"],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
});
