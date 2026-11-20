import { describe, expect, it, vi } from "vitest";
import { criarClienteInbox } from "./cliente";
import { PREFERENCIA_PADRAO } from "./contratos";

const usuario = "00000000-0000-0000-0000-000000000001";
const conversa = "00000000-0000-0000-0000-000000000098";
const pref = { conversaId: conversa, prioridade: "urgente" as const, situacao: "concluida" as const, favorita: true };

describe("cliente HTTP de preferências", () => {
  it("carrega com cookies, sem cache ou identificação do dono na URL", async () => {
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ usuarioId: usuario, preferencias: [pref] }));
    const cancelamento = new AbortController();
    expect(await criarClienteInbox(usuario, buscar).listar([conversa], cancelamento.signal)).toEqual({ usuarioId: usuario, preferencias: [pref] });
    expect(buscar).toHaveBeenCalledWith(`/api/inbox/preferencias?conversaId=${conversa}`, expect.objectContaining({
      method: "GET", credentials: "same-origin", cache: "no-store", signal: cancelamento.signal,
    }));
    expect(buscar.mock.calls[0][0]).not.toContain(usuario);
  });
  it("PUT persiste e uma nova instância recupera a organização; DELETE restaura o padrão", async () => {
    let armazenada = { conversaId: conversa, ...PREFERENCIA_PADRAO };
    const buscar = vi.fn<typeof fetch>().mockImplementation(async (_url, opcoes) => {
      if (opcoes?.method === "PUT") armazenada = JSON.parse(String(opcoes.body)).preferencias[0];
      if (opcoes?.method === "DELETE") armazenada = { conversaId: conversa, ...PREFERENCIA_PADRAO };
      return Response.json({ usuarioId: usuario, preferencias: [armazenada] });
    });
    await criarClienteInbox(usuario, buscar).salvar([pref]);
    expect((await criarClienteInbox(usuario, buscar).listar([conversa])).preferencias).toEqual([pref]);
    expect((await criarClienteInbox(usuario, buscar).excluir([conversa])).preferencias).toEqual([{ conversaId: conversa, ...PREFERENCIA_PADRAO }]);
    expect(buscar.mock.calls[0][1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(String(buscar.mock.calls[0][1]?.body))).toEqual({ preferencias: [pref] });
  });
  it.each([401, 403, 404, 500])("propaga status %s sem publicar corpo de erro interno", async (status) => {
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ erro: "segredo SQL" }, { status }));
    await expect(criarClienteInbox(usuario, buscar).listar([conversa])).rejects.toMatchObject({ status });
  });
  it.each([
    { usuarioId: "outro", preferencias: [pref] },
    { usuarioId: usuario, preferencias: [] },
    { usuarioId: usuario, preferencias: [pref, pref] },
    { usuarioId: usuario, preferencias: [{ ...pref, conversaId: "00000000-0000-0000-0000-000000000099" }] },
    { usuarioId: usuario, preferencias: [{ ...pref, favorita: "true" }] },
    { usuarioId: usuario, preferencias: [{ ...pref, prioridade: "critica" }] },
  ])("recusa resposta inconsistente ou de outra conta: %j", async (dados) => {
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(Response.json(dados));
    await expect(criarClienteInbox(usuario, buscar).listar([conversa])).rejects.toMatchObject({ status: 500 });
  });
});
