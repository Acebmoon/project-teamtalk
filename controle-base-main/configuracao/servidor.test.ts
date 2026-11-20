import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ cliente: vi.fn(), cookies: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.cliente }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

import { NextRequest } from "next/server";
import { criarServidor } from "../supabase/servidor";
import { criarServidorMiddleware } from "../supabase/middleware";
import { obterAmbienteServidor } from "./servidor";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_servidor_ficticia");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_privada_ficticia");
  vi.stubEnv("EMAIL_PROVIDER", "disabled");
  vi.stubEnv("NODE_ENV", "production");
  mocks.cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
});

afterEach(() => vi.unstubAllEnvs());

describe("consumo de ambiente no servidor", () => {
  it("SSR usa somente URL/anon key validadas e preserva cookies seguros", async () => {
    await criarServidor();
    expect(mocks.cliente).toHaveBeenCalledWith("https://supabase.example.com", "sb_publishable_servidor_ficticia", expect.objectContaining({
      cookieOptions: { secure: true, sameSite: "lax", path: "/" },
    }));
    expect(JSON.stringify(mocks.cliente.mock.calls)).not.toContain("sb_secret_privada_ficticia");
  });

  it("middleware usa chave pública validada sem substituir JWT por serviço", () => {
    criarServidorMiddleware(new NextRequest("https://homologacao.example.com/login"));
    expect(mocks.cliente).toHaveBeenCalledWith("https://supabase.example.com", "sb_publishable_servidor_ficticia", expect.objectContaining({
      cookieOptions: { secure: true, sameSite: "lax", path: "/" },
    }));
  });

  it("bloqueia configuração insegura antes de criar cliente ou acessar cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_privada_ficticia");
    await expect(criarServidor()).rejects.toThrow("variáveis públicas não podem conter segredos");
    expect(() => criarServidorMiddleware(new NextRequest("https://homologacao.example.com/login"))).toThrow("variáveis públicas não podem conter segredos");
    expect(mocks.cliente).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("revalida ambiente em runtime sem conservar resultado inseguro em cache", () => {
    expect(obterAmbienteServidor().sessaoMaxHoras).toBe(12);
    vi.stubEnv("SESSAO_MAX_HORAS", "0");
    expect(() => obterAmbienteServidor()).toThrow("SESSAO_MAX_HORAS");
  });
});
