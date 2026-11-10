import { describe, expect, it } from "vitest";
import { decidirAcesso } from "./decidir-acesso";

const agora = 1_800_000_000;
const padrao = {
  usuarioValido: true,
  autorizado: true,
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

  it("encerra após 12 horas do login daquele aparelho", () => {
    expect(decidirAcesso({
      ...padrao,
      amr: [{ method: "password", timestamp: agora - 12 * 3600 }],
    })).toBe("sessao-vencida");
  });

  it("mantém sessão válida e autorizada", () => {
    expect(decidirAcesso(padrao)).toBe("seguir");
  });

  it("recusa token sem timestamp de login por senha", () => {
    expect(decidirAcesso({ ...padrao, amr: [{ method: "token_refresh", timestamp: agora }] }))
      .toBe("sessao-vencida");
  });
});
