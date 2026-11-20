import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./fixture", import.meta.url)),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@design": fileURLToPath(new URL("..", import.meta.url)) },
  },
  server: { fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
});
