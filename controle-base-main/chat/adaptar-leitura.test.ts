import { describe, expect, it } from "vitest";
import type { StatusLeituraMensagem } from "./contratos-leituras";
import { adaptarEstadoLeitura, estadoLeituraDestinatario } from "./adaptar-leitura";
import { validarIdsLeituras } from "./validar-leituras";

const mensagem = { id: "mensagem", conversaId: "conversa", remetenteId: "autor", estado: "enviada" as const, conteudo: "Olá" };
const status: StatusLeituraMensagem = { mensagemId: "mensagem", remetenteId: "autor", destinatarios: [
  { usuarioId: "a", entrouEm: "ontem", lidaEm: "agora" }, { usuarioId: "b", entrouEm: "ontem", lidaEm: null },
] };

describe("adaptação para o contrato visual do PR #94", () => {
  it("confirma leitura somente do destinatário que visualizou", () => {
    expect(estadoLeituraDestinatario(status, "a")).toBe("lida");
    expect(estadoLeituraDestinatario(status, "b")).toBe("enviada");
    expect(estadoLeituraDestinatario(status, "terceiro")).toBe("enviada");
    expect(adaptarEstadoLeitura(mensagem, status, "a")).toEqual({ ...mensagem, estado: "lida" });
    expect(adaptarEstadoLeitura(mensagem, status, "b")).toEqual(mensagem);
  });
  it("não confirma o grupo inteiro depois de apenas uma leitura", () => {
    expect(adaptarEstadoLeitura(mensagem, status).estado).toBe("enviada");
    expect(adaptarEstadoLeitura(mensagem, { ...status, destinatarios: status.destinatarios.map((item) => ({ ...item, lidaEm: "agora" })) }).estado).toBe("lida");
    expect(adaptarEstadoLeitura(mensagem, { ...status, destinatarios: [] }).estado).toBe("enviada");
  });
  it("preserva envio em andamento/falho e ignora status de outra mensagem", () => {
    expect(adaptarEstadoLeitura({ ...mensagem, estado: "falha" as const }, status, "a").estado).toBe("falha");
    expect(adaptarEstadoLeitura({ ...mensagem, estado: "enviando" as const }, status, "a").estado).toBe("enviando");
    expect(adaptarEstadoLeitura(mensagem, undefined)).toBe(mensagem);
    expect(adaptarEstadoLeitura(mensagem, { ...status, mensagemId: "outra" })).toBe(mensagem);
    expect(adaptarEstadoLeitura(mensagem, { ...status, remetenteId: "outro" })).toBe(mensagem);
  });
  it("normaliza IDs sem permitir duplicatas com caixa diferente", () => {
    const id = "abcdef01-abcd-abcd-abcd-abcdefabcdef";
    expect(validarIdsLeituras([id.toUpperCase()])).toEqual([id]);
    expect(() => validarIdsLeituras([id, id.toUpperCase()])).toThrow("Não repita");
  });
});
