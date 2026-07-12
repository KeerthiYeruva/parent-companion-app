import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "react";
            }

            if (id.includes("pdfjs-dist")) {
              return "pdf";
            }

            if (
              id.includes("firebase") ||
              id.includes("dexie") ||
              id.includes("zustand")
            ) {
              return "data";
            }

            if (
              id.includes("@hookform/resolvers") ||
              id.includes("react-hook-form") ||
              id.includes("zod")
            ) {
              return "forms";
            }

            if (id.includes("dayjs")) {
              return "dates";
            }

            return "vendor";
          }

          if (id.includes("/src/features/documents/")) {
            return "features";
          }

          if (id.includes("/src/features/import/")) {
            return "features";
          }

          if (id.includes("/src/features/planning/")) {
            return "features";
          }

          if (id.includes("/src/store/")) {
            return "shared";
          }

          if (id.includes("/src/db/")) {
            return "shared";
          }

          if (id.includes("/src/components/")) {
            return "shared";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});