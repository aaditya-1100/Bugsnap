import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        editor: resolve(__dirname, "editor.html"),
        "service-worker": resolve(__dirname, "src/background/service-worker.ts"),
        content: resolve(__dirname, "src/content/content.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "service-worker" || chunkInfo.name === "content") {
            return `${chunkInfo.name}.js`;
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
