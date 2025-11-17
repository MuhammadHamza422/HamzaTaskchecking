import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.js",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // UI libraries
          "ui-vendor": ["antd", "lucide-react", "react-icons"],
          // Chart libraries
          "chart-vendor": ["chart.js", "react-chartjs-2", "recharts"],
          // QR/Image processing
          "media-vendor": [
            "html2canvas-pro",
            "jspdf",
            "jsqr",
            "qr-scanner",
            "qrcode.react",
            "@zxing/library",
          ],
          // State management
          "state-vendor": ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          // Data processing
          "data-vendor": ["axios", "papaparse", "react-csv", "lodash"],
          // Query library
          "query-vendor": [
            "@tanstack/react-query",
            "@tanstack/react-query-devtools",
          ],
          // Other utilities
          "utils-vendor": [
            "sweetalert2",
            "framer-motion",
            "react-responsive",
            "react-select",
            "react-webcam",
            "react-image-crop",
            "react-loading-skeleton",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB (chunks are already split)
  },
});
