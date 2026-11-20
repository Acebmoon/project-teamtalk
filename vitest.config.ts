import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: {
    "@controle": fileURLToPath(new URL("./controle-base-main", import.meta.url)),
    "@design": fileURLToPath(new URL("./design-em-react", import.meta.url)),
  } },
  esbuild: { jsx: "automatic" },
  test: { exclude: ["**/node_modules/**", "**/.next/**"], maxWorkers: 2 },
});
