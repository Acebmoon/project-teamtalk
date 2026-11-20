import { afterEach, describe, expect, it, vi } from "vitest";
import type { AcessoAdminTI } from "../auth/exigir-admin-ti";
import { criarClienteAdmin } from "./cliente";

const m = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: m.createClient }));
const acesso = { usuario: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } as AcessoAdminTI;
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("cliente de serviço exclusivo do servidor", () => {
  it("usa somente chave privada e desativa sessão persistida", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-sintetica-de-teste");
    criarClienteAdmin(acesso);
    expect(m.createClient).toHaveBeenCalledWith("https://supabase.test", "chave-sintetica-de-teste", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
  it("não usa chave pública como fallback e falha com mensagem segura", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-publica-teste");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => criarClienteAdmin(acesso)).toThrow("Gestão de contas indisponível.");
    expect(m.createClient).not.toHaveBeenCalled();
  });
  it("recusa um contexto sem usuário do guard", () => {
    expect(() => criarClienteAdmin({ usuario: { id: "" } } as AcessoAdminTI)).toThrow("Área restrita à TI.");
    expect(m.createClient).not.toHaveBeenCalled();
  });
});
