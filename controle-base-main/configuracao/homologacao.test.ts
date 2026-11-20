import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { headersSeguranca } from "./headers";
import { validarAmbienteServidor } from "./ambiente";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const lerJson = (arquivo: string) => JSON.parse(readFileSync(path.join(raiz, arquivo), "utf8"));

afterEach(() => vi.unstubAllEnvs());

describe("contrato de implantação", () => {
  it("instala a partir da raiz com lockfile e executa todos os gates no workspace Next", () => {
    const vercel = lerJson("base(tempval)/vercel.json");
    expect(vercel.framework).toBe("nextjs");
    expect(vercel.installCommand).toMatch(/^cd \.\. && npm ci$/);
    expect(vercel.buildCommand).toBe("npm run build:homologacao");
    expect(vercel).not.toHaveProperty("rootDirectory");
    expect(vercel).not.toHaveProperty("outputDirectory");
    expect(vercel).not.toHaveProperty("env");
    const workspace = lerJson("base(tempval)/package.json");
    expect(workspace.scripts["build:homologacao"]).toMatch(/typecheck.*&&.*lint.*&&.*test.*&&.*run build$/);
    const repositorio = lerJson("package.json");
    const lock = lerJson("package-lock.json");
    expect(repositorio.workspaces).toContain("base(tempval)");
    expect(lock.packages["base(tempval)"].dependencies).toEqual(workspace.dependencies);
    expect(workspace.engines.node).toBe(repositorio.engines.node);
  });

  it("mantém aliases para as três pastas", () => {
    const tsconfig = lerJson("base(tempval)/tsconfig.json");
    expect(tsconfig.compilerOptions.paths["@controle/*"]).toContain("../controle-base-main/*");
    expect(tsconfig.compilerOptions.paths["@design/*"]).toContain("../design-em-react/*");
  });

  it("template funciona ao substituir apenas a chave pública local", () => {
    const linhas = readFileSync(path.join(raiz, "base(tempval)/.env.example"), "utf8").split("\n");
    const env = Object.fromEntries(linhas.filter((linha) => /^[A-Z_]+=/.test(linha)).map((linha) => {
      const posicao = linha.indexOf("=");
      return [linha.slice(0, posicao), linha.slice(posicao + 1)];
    }));
    const publicas = Object.keys(env).filter((nome) => nome.startsWith("NEXT_PUBLIC_"));
    expect(publicas.sort()).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);
    expect(() => validarAmbienteServidor({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_local_ficticia" })).not.toThrow();
  });

  it("recusa integração de migrations com versões repetidas antes do deploy", () => {
    const arquivos = readdirSync(path.join(raiz, "base(tempval)/supabase/migrations")).filter((nome) => nome.endsWith(".sql"));
    const versoes = arquivos.map((nome) => nome.split("_")[0]);
    expect(new Set(versoes).size, "Resolver timestamps repetidos antes de aplicar migrations; ver guia de homologação").toBe(versoes.length);
  });

  it("Next aplica os headers em todas as rotas e rastreia as pastas externas sem serializar segredos", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_config_ficticia");
    vi.stubEnv("NODE_ENV", "production");
    const { default: next } = await import("../../base(tempval)/next.config");
    expect(next.experimental?.externalDir).toBe(true);
    expect(next.outputFileTracingRoot).toBe(path.resolve(raiz));
    expect(next.poweredByHeader).toBe(false);
    expect(await next.headers!()).toEqual([{ source: "/:path*", headers: headersSeguranca(true) }]);
    expect(next).not.toHaveProperty("env");
  });
});

describe("headers de segurança HTTP/HTTPS", () => {
  it("protege MIME, referenciador, enquadramento e permissões", () => {
    const headers = new Headers(headersSeguranca(true).map(({ key, value }): [string, string] => [key, value]));
    expect(headers.get("strict-transport-security")).toMatch(/^max-age=\d+$/);
    expect(Number(headers.get("strict-transport-security")?.split("=")[1])).toBeGreaterThanOrEqual(31536000);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toContain("microphone=()");
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("não exige HSTS para desenvolvimento HTTP local nem afeta subdomínios não aprovados", () => {
    expect(headersSeguranca(false).map(({ key }) => key)).not.toContain("Strict-Transport-Security");
    expect(headersSeguranca(true).find(({ key }) => key === "Strict-Transport-Security")?.value).not.toMatch(/includeSubDomains|preload/);
  });

  it("preserva hidratação, WSS, formulários da aplicação e visualização/download mobile", () => {
    const csp = headersSeguranca(true).find(({ key }) => key === "Content-Security-Policy")!.value;
    expect(csp).toContain("form-action 'self'");
    // Uma CSP com script/connect restritivo exige nonces/origens dinâmicas antes de ser adicionada.
    expect(csp).not.toMatch(/(?:^|;)\s*(?:default-src|script-src|connect-src|sandbox)\b/);
    expect(headersSeguranca(true).map(({ key }) => key)).not.toContain("Cross-Origin-Embedder-Policy");
  });

  it("não duplica headers nem sobrescreve cookies/cache/CORS das rotas autenticadas", () => {
    const nomes = headersSeguranca(true).map(({ key }) => key.toLowerCase());
    expect(new Set(nomes).size).toBe(nomes.length);
    expect(nomes).not.toContain("set-cookie");
    expect(nomes).not.toContain("cache-control");
    expect(nomes).not.toContain("access-control-allow-origin");
  });
});
