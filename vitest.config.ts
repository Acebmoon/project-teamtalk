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
    maxWorkers: 2,
    setupFiles: ["./controle-base-main/testes/preparar-vitest.ts"],
    env: {
      // O runner de testes usa React de teste e configuração local, mesmo no build Vercel.
      NODE_ENV: "test",
      VERCEL: "0",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_teamtalk_test",
    },
    exclude: [...configDefaults.exclude, "design-em-react/testes/mobile.test.ts"],
  },
});
