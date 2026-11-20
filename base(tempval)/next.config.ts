import path from "node:path";
import type { NextConfig } from "next";
import { validarAmbienteServidor } from "../controle-base-main/configuracao/ambiente";
import { headersSeguranca } from "../controle-base-main/configuracao/headers";

// Next carrega .env* antes desta configuração. Falha antes de gerar um bundle inseguro.
validarAmbienteServidor(process.env);

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: headersSeguranca(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
