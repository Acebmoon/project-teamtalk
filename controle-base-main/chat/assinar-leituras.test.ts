import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assinarLeituras } from "./assinar-leituras";
import { FalhaClienteLeituras, listarLeituras, marcarMensagemExibida } from "./leituras-cliente";

const conversaId = "00000000-0000-0000-0000-000000000080";
const mensagemId = "00000000-0000-0000-0000-000000000081";
const outraMensagem = "00000000-0000-0000-0000-000000000082";
const statusLeituras = { usuarioId: "usuario", conversaId, mensagens: [] };
const fetchMock = vi.fn();
const aoAtualizar = vi.fn();
const aoErro = vi.fn();
const opcoes = { conversaId, mensagemIds: [mensagemId], aoAtualizar, aoErro };
let evento: (payload: { new: { message_id: string; user_id?: string } }) => void;
let estado: (status: string) => void;
const canal = { on: vi.fn(), subscribe: vi.fn() };
const channel = vi.fn();
const removeChannel = vi.fn();
const supabase = { channel, removeChannel } as unknown as SupabaseClient;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json(statusLeituras));
  canal.on.mockImplementation((_tipo, _filtro, callback) => { evento = callback; return canal; });
  canal.subscribe.mockImplementation((callback) => { estado = callback; return canal; });
  channel.mockReturnValue(canal);
  removeChannel.mockResolvedValue("ok");
});
afterEach(() => vi.unstubAllGlobals());

describe("assinatura de recibos com revalidação HTTP", () => {
  it("filtra INSERTs pelos IDs e consulta o estado após SUBSCRIBED", async () => {
    const encerrar = assinarLeituras(supabase, opcoes);
    expect(canal.on).toHaveBeenCalledWith("postgres_changes", {
      event: "INSERT", schema: "public", table: "message_reads", filter: `message_id=in.(${mensagemId})`,
    }, expect.any(Function));
    expect(fetchMock).not.toHaveBeenCalled();
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(statusLeituras));
    expect(fetchMock).toHaveBeenCalledWith(`/api/conversas/${conversaId}/leituras?mensagemId=${mensagemId}`, {
      credentials: "same-origin", cache: "no-store", signal: expect.any(AbortSignal),
    });
    expect(fetchMock.mock.calls[0][1].method).toBeUndefined();
    await encerrar();
  });
  it("entrega o snapshot autorizado, sem confiar na identidade do payload bruto", async () => {
    const encerrar = assinarLeituras(supabase, opcoes);
    evento({ new: { message_id: mensagemId, user_id: "forjado" } });
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(statusLeituras));
    expect(JSON.stringify(aoAtualizar.mock.calls)).not.toContain("forjado");
    await encerrar();
  });
  it("ignora mensagens fora do lote e recupera o snapshot na reconexão", async () => {
    const encerrar = assinarLeituras(supabase, opcoes);
    evento({ new: { message_id: outraMensagem } });
    expect(fetchMock).not.toHaveBeenCalled();
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(1));
    estado("CHANNEL_ERROR");
    expect(aoErro).toHaveBeenCalledOnce();
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(2));
    await encerrar();
  });
  it("agrupa eventos concorrentes sem perder o último estado", async () => {
    let concluir!: (resposta: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { concluir = resolve; }));
    const encerrar = assinarLeituras(supabase, opcoes);
    estado("SUBSCRIBED");
    evento({ new: { message_id: mensagemId } });
    evento({ new: { message_id: mensagemId } });
    expect(fetchMock).toHaveBeenCalledOnce();
    concluir(Response.json(statusLeituras));
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await encerrar();
  });
  it.each([401, 403])("fecha o canal em sessão vencida ou acesso negado (%s)", async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ erro: "Acesso negado" }, { status }));
    assinarLeituras(supabase, opcoes);
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(removeChannel).toHaveBeenCalledWith(canal));
    expect(aoErro.mock.calls[0][0]).toMatchObject({ status });
    expect(aoAtualizar).not.toHaveBeenCalled();
    evento({ new: { message_id: mensagemId } });
    estado("SUBSCRIBED");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("cancela requisição, remove o canal uma vez e ignora retornos após troca de conversa", async () => {
    let concluir!: (resposta: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { concluir = resolve; }));
    const encerrar = assinarLeituras(supabase, opcoes);
    estado("SUBSCRIBED");
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    await encerrar(); await encerrar();
    expect(signal.aborted).toBe(true);
    concluir(Response.json(statusLeituras));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    evento({ new: { message_id: mensagemId } }); estado("CLOSED");
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(aoAtualizar).not.toHaveBeenCalled();
    expect(aoErro).not.toHaveBeenCalled();
  });
  it("permite recuperar erro de rede na próxima reconexão", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const encerrar = assinarLeituras(supabase, opcoes);
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoErro).toHaveBeenCalledOnce());
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledOnce());
    await encerrar();
  });
  it.each(["TIMED_OUT", "CLOSED"])("informa interrupção: %s", async (erro) => {
    const encerrar = assinarLeituras(supabase, opcoes);
    estado(erro);
    expect(aoErro).toHaveBeenCalledWith(expect.any(Error));
    await encerrar();
  });
  it("valida conversa e lote, e mantém nomes de canal independentes", async () => {
    expect(() => assinarLeituras(supabase, { ...opcoes, conversaId: "x" })).toThrow();
    expect(() => assinarLeituras(supabase, { ...opcoes, mensagemIds: [] })).toThrow();
    expect(() => assinarLeituras(supabase, { ...opcoes, mensagemIds: [mensagemId, mensagemId] })).toThrow();
    const primeiro = assinarLeituras(supabase, opcoes);
    const segundo = assinarLeituras(supabase, opcoes);
    expect(channel.mock.calls[0][0]).not.toBe(channel.mock.calls[1][0]);
    await primeiro(); await segundo();
  });
});

describe("transporte HTTP de leituras", () => {
  it("confirma só exibida: true, sem aceitar ID de destinatário ou horário", async () => {
    const recibo = { usuarioId: "usuario", conversaId, leitura: { mensagemId, usuarioId: "usuario", lidaEm: "agora" } };
    fetchMock.mockResolvedValueOnce(Response.json(recibo));
    expect(await marcarMensagemExibida(conversaId, mensagemId)).toEqual(recibo);
    expect(fetchMock).toHaveBeenCalledWith(`/api/conversas/${conversaId}/mensagens/${mensagemId}/leituras`, {
      method: "POST", credentials: "same-origin", cache: "no-store", signal: undefined,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exibida: true }),
    });
  });
  it("consulta vários IDs na mesma chamada", async () => {
    await listarLeituras(conversaId, [mensagemId, outraMensagem]);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/conversas/${conversaId}/leituras?mensagemId=${mensagemId}&mensagemId=${outraMensagem}`);
  });
  it("propaga erros públicos e trata respostas sem JSON", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ erro: "Negado" }, { status: 403 }));
    await expect(marcarMensagemExibida(conversaId, mensagemId)).rejects.toMatchObject({ status: 403, message: "Negado" });
    fetchMock.mockResolvedValueOnce(new Response("falha", { status: 500 }));
    await expect(listarLeituras(conversaId, [mensagemId])).rejects.toBeInstanceOf(FalhaClienteLeituras);
  });
  it("valida IDs antes de enviar qualquer requisição", async () => {
    await expect(listarLeituras("x", [mensagemId])).rejects.toThrow();
    await expect(marcarMensagemExibida(conversaId, "x")).rejects.toThrow();
    await expect(listarLeituras(conversaId, [])).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
