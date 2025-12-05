import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".", // adjust if your source folder differs
  base: "/pdf-annotater/",
  optimizeDeps: {
    include: ["pdfjs-dist", "tesseract.js"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("tesseract.js")) return "tesseract";
        },
      },
    },
  },
});
