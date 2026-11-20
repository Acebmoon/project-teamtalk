import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@controle": fileURLToPath(new URL("./controle-base-main", import.meta.url)),
      "@design": fileURLToPath(new URL("./design-em-react", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "design-em-react/testes/mobile.test.ts"],
  },
});
