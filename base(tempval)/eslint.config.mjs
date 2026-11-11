import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const configuracao = [
  { ignores: ["**/.next/**", "**/next-env.d.ts", "**/node_modules/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
];

export default configuracao;
