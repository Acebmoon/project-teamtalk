import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { excluirPreferencias, listarPreferencias, salvarPreferencias } from "./servico";
import { PREFERENCIA_PADRAO } from "./contratos";

const usuario = "00000000-0000-0000-0000-000000000001";
const outro = "00000000-0000-0000-0000-000000000002";
const conversa = "00000000-0000-0000-0000-000000000098";
const alheia = "00000000-0000-0000-0000-000000000099";
const pref = { conversaId: conversa, prioridade: "alta" as const, situacao: "acompanhar" as const, favorita: true };
const linha = { user_id: usuario, conversation_id: conversa, priority: "alta", situation: "acompanhar", is_favorite: true };
const from = vi.fn();
const cliente = { from } as unknown as SupabaseClient;

function consulta(data: unknown, error: { code: string } | null = null) {
  const resposta = { data, error };
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    then: (resolver: (valor: unknown) => unknown) => Promise.resolve(resposta).then(resolver),
  };
  from.mockReturnValueOnce(query);
  return query;
}
beforeEach(() => vi.resetAllMocks());

describe("serviço da Inbox com cliente de sessão", () => {
  it("devolve padrões para conversa autorizada sem linha persistida", async () => {
    const participacao = consulta([{ conversation_id: conversa }]);
    const preferencias = consulta([]);
    expect(await listarPreferencias(cliente, usuario, [conversa])).toEqual({
      usuarioId: usuario, preferencias: [{ conversaId: conversa, ...PREFERENCIA_PADRAO }],
    });
    expect(participacao.eq).toHaveBeenCalledWith("user_id", usuario);
    expect(preferencias.eq).toHaveBeenCalledWith("user_id", usuario);
    expect(preferencias.in).toHaveBeenCalledWith("conversation_id", [conversa]);
  });
  it("cria/atualiza um lote em uma operação e deriva o dono da sessão", async () => {
    consulta([{ conversation_id: conversa }]);
    const escrita = consulta([linha]);
    expect(await salvarPreferencias(cliente, usuario, [pref])).toEqual({ usuarioId: usuario, preferencias: [pref] });
    expect(escrita.upsert).toHaveBeenCalledWith([linha], { onConflict: "user_id,conversation_id" });
    expect(from.mock.calls.map(([tabela]) => tabela)).toEqual(["conversation_participants", "inbox_preferences"]);
  });
  it("exclui só preferências próprias e devolve o padrão", async () => {
    consulta([{ conversation_id: conversa }]);
    const exclusao = consulta(null);
    expect(await excluirPreferencias(cliente, usuario, [conversa])).toMatchObject({ preferencias: [{ ...PREFERENCIA_PADRAO }] });
    expect(exclusao.delete).toHaveBeenCalled();
    expect(exclusao.eq).toHaveBeenCalledWith("user_id", usuario);
    expect(exclusao.in).toHaveBeenCalledWith("conversation_id", [conversa]);
  });
  it.each(["listar", "salvar", "excluir"])("%s nega conversa alheia/inexistente antes de acessar preferências", async (operacao) => {
    consulta([]);
    const promessa = operacao === "listar" ? listarPreferencias(cliente, usuario, [alheia])
      : operacao === "salvar" ? salvarPreferencias(cliente, usuario, [{ ...pref, conversaId: alheia }])
      : excluirPreferencias(cliente, usuario, [alheia]);
    await expect(promessa).rejects.toMatchObject({ status: 404, message: "Conversa indisponível." });
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("rejeita lote misto sem efetuar nenhuma escrita", async () => {
    consulta([{ conversation_id: conversa }]);
    await expect(salvarPreferencias(cliente, usuario, [pref, { ...pref, conversaId: alheia }])).rejects.toMatchObject({ status: 404 });
    expect(from).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...linha, user_id: outro }, { ...linha, conversation_id: alheia },
    { ...linha, priority: "invalida" },
  ])("recusa resposta que vazaria dados fora do contrato: %j", async (invalida) => {
    consulta([{ conversation_id: conversa }]); consulta([invalida]);
    await expect(listarPreferencias(cliente, usuario, [conversa])).rejects.toMatchObject({ status: 500 });
  });
  it("recusa linhas duplicadas", async () => {
    consulta([{ conversation_id: conversa }]); consulta([linha, linha]);
    await expect(listarPreferencias(cliente, usuario, [conversa])).rejects.toMatchObject({ status: 500 });
  });
  it.each(["42501", "23503"])("traduz revogação concorrente (%s) para erro uniforme", async (code) => {
    consulta([{ conversation_id: conversa }]); consulta(null, { code });
    await expect(salvarPreferencias(cliente, usuario, [pref])).rejects.toMatchObject({ status: 404 });
  });
  it("não expõe erro interno e recusa escrita sem retorno completo", async () => {
    consulta([{ conversation_id: conversa }]); consulta(null, { code: "XX000" });
    await expect(listarPreferencias(cliente, usuario, [conversa])).rejects.toMatchObject({ status: 500 });
    consulta([{ conversation_id: conversa }]); consulta([]);
    await expect(salvarPreferencias(cliente, usuario, [pref])).rejects.toMatchObject({ status: 404 });
  });
  it("valida entradas antes de consultar o banco", async () => {
    await expect(salvarPreferencias(cliente, usuario, [{ ...pref, favorita: "true" } as never])).rejects.toMatchObject({ status: 400 });
    expect(from).not.toHaveBeenCalled();
  });
});
