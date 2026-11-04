import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { rollupOptions: { input: { index: "index.html", tts: "tts.html", stt: "stt.html" } }, target: "esnext" },
  worker: { format: "es" },
});
