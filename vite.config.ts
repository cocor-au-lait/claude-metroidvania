import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
