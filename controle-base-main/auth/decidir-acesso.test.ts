import { describe, expect, it } from "vitest";
import { decidirAcesso } from "./decidir-acesso";

const agora = 1_800_000_000;
const padrao = {
  usuarioValido: true,
  autorizado: true,
  precisaTrocarSenha: false,
  amr: [{ method: "password", timestamp: agora - 3600 }],
  agora,
  limiteHoras: 12,
};

describe("decidirAcesso", () => {
  it("envia para login quando não há sessão", () => {
    expect(decidirAcesso({ ...padrao, usuarioValido: false })).toBe("login");
  });

  it("encerra quando a conta não está autorizada", () => {
    expect(decidirAcesso({ ...padrao, autorizado: false })).toBe("acesso-negado");
  });

  it("encaminha para troca com sessão válida e usuário autorizado", () => {
    expect(decidirAcesso({ ...padrao, precisaTrocarSenha: true })).toBe("trocar-senha");
  });

  it("nega acesso mesmo que a senha ainda precise ser trocada", () => {
    expect(decidirAcesso({
      ...padrao, autorizado: false, precisaTrocarSenha: true,
    })).toBe("acesso-negado");
  });

  it("expiração prevalece sobre a troca obrigatória", () => {
    expect(decidirAcesso({
      ...padrao, precisaTrocarSenha: true,
      amr: [{ method: "password", timestamp: agora - 13 * 3600 }],
    })).toBe("sessao-vencida");
  });

  it("encerra após 12 horas do login daquele aparelho", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "password", timestamp: agora - 12 * 3600 }],
    })).toBe("sessao-vencida");
  });

  it("mantém sessão válida e autorizada", () => {
    expect(decidirAcesso(padrao)).toBe("seguir");
  });

  it("aceita autenticação por outro método", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "otp", timestamp: agora - 3600 }],
    })).toBe("seguir");
  });

  it("considera o menor timestamp entre métodos de login", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [
        { method: "otp", timestamp: agora - 13 * 3600 },
        { method: "password", timestamp: agora - 60 },
        { method: "token_refresh", timestamp: agora },
      ],
    })).toBe("sessao-vencida");
  });

  it("aceita relógio do Supabase dois minutos adiantado", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "password", timestamp: agora + 120 }],
    })).toBe("seguir");
  });

  it("recusa relógio dez minutos adiantado", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "password", timestamp: agora + 600 }],
    })).toBe("sessao-vencida");
  });

  it("recusa token que contém apenas token_refresh", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "token_refresh", timestamp: agora }],
    })).toBe("sessao-vencida");
  });

  it("recusa token sem entrada de login válida", () => {
    expect(decidirAcesso({ ...padrao, amr: [] })).toBe("sessao-vencida");
  });
});
