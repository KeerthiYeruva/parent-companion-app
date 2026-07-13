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
          if (!id.includes("node_modules")) {
            return undefined;
          }

          const normalizedId = id.replaceAll("\\", "/");

          if (
            /node_modules\/(?:react|react-dom|scheduler)\//.test(
              normalizedId,
            ) ||
            normalizedId.includes("node_modules/react-router-dom/")
          ) {
            return "react";
          }

          if (normalizedId.includes("node_modules/firebase/")) {
            return "firebase";
          }

          if (
            normalizedId.includes("node_modules/@hookform/resolvers/") ||
            normalizedId.includes("node_modules/react-hook-form/") ||
            normalizedId.includes("node_modules/zod/")
          ) {
            return "forms";
          }

          if (normalizedId.includes("node_modules/lucide-react/")) {
            return "icons";
          }

          if (normalizedId.includes("node_modules/dayjs/")) {
            return "dates";
          }

          return "vendor";
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
