import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AcessoAdminTI } from "../../auth/exigir-admin-ti";
import { criarClienteAdmin } from "../cliente";

const criar = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: criar }));
const acesso = { usuario: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } as AcessoAdminTI;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-apenas-de-teste");
});
afterEach(() => vi.unstubAllEnvs());
describe("cliente administrativo exclusivo do servidor", () => {
  it("desliga persistência, renovação e detecção de sessão", () => {
    criarClienteAdmin(acesso);
    expect(criar).toHaveBeenCalledWith("https://supabase.test", "chave-apenas-de-teste", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
  it("falha fechado sem chave e não a inclui no erro", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => criarClienteAdmin(acesso)).toThrow("indisponível");
    expect(criar).not.toHaveBeenCalled();
  });
});
