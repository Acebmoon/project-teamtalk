import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assinarMensagens } from "./assinar-mensagens";
import { enviarMensagemTexto, FalhaClienteMensagens, listarMensagens } from "./mensagens-cliente";

const conversaId = "00000000-0000-0000-0000-000000000079";
const outraConversa = "00000000-0000-0000-0000-000000000078";
const pagina = { usuarioId: "usuario", conversaId, mensagens: [], paginacao: { limite: 50, proximoCursor: null } };
const fetchMock = vi.fn();
const aoAtualizar = vi.fn();
const aoErro = vi.fn();
let evento: (payload: { new: { conversation_id: string } }) => void;
let estado: (status: string) => void;
const canal = { on: vi.fn(), subscribe: vi.fn() };
const channel = vi.fn();
const removeChannel = vi.fn();
const supabase = { channel, removeChannel } as unknown as SupabaseClient;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json(pagina));
  canal.on.mockImplementation((_tipo, _filtro, callback) => { evento = callback; return canal; });
  canal.subscribe.mockImplementation((callback) => { estado = callback; return canal; });
  channel.mockReturnValue(canal);
  removeChannel.mockResolvedValue("ok");
});
afterEach(() => vi.unstubAllGlobals());

describe("assinatura Realtime com revalidação HTTP", () => {
  it("escuta INSERT da conversa e faz a primeira leitura após SUBSCRIBED", async () => {
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    expect(canal.on).toHaveBeenCalledWith("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversaId}`,
    }, expect.any(Function));
    expect(fetchMock).not.toHaveBeenCalled();
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(pagina));
    expect(fetchMock).toHaveBeenCalledWith(`/api/conversas/${conversaId}/mensagens?limite=50`, {
      credentials: "same-origin", cache: "no-store", signal: expect.any(AbortSignal),
    });
    await encerrar();
  });

  it("recebe texto pelo contrato da API sem publicar o payload bruto do websocket", async () => {
    const mensagem = { id: "mensagem", conversaId, remetenteId: "outro", tipo: "text", conteudo: "Olá" };
    fetchMock.mockResolvedValueOnce(Response.json({ ...pagina, mensagens: [mensagem] }));
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    evento({ new: { conversation_id: conversaId } });
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith({ ...pagina, mensagens: [mensagem] }));
    expect(aoErro).not.toHaveBeenCalled();
    await encerrar();
  });

  it("ignora evento de outra conversa e sincroniza novamente na reconexão", async () => {
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    evento({ new: { conversation_id: outraConversa } });
    expect(fetchMock).not.toHaveBeenCalled();
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(1));
    estado("CHANNEL_ERROR");
    expect(aoErro).toHaveBeenCalledTimes(1);
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(2));
    await encerrar();
  });

  it("agrupa eventos concorrentes e não perde a atualização durante uma leitura", async () => {
    let concluir!: (resposta: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { concluir = resolve; }));
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    estado("SUBSCRIBED");
    evento({ new: { conversation_id: conversaId } });
    evento({ new: { conversation_id: conversaId } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    concluir(Response.json(pagina));
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await encerrar();
  });

  it.each([401, 403])("encerra a assinatura se a API revogar acesso (%s)", async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ erro: "Acesso negado" }, { status }));
    assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(removeChannel).toHaveBeenCalledWith(canal));
    expect(aoErro.mock.calls[0][0]).toMatchObject({ status });
    expect(aoAtualizar).not.toHaveBeenCalled();
    evento({ new: { conversation_id: conversaId } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancela leitura em voo, remove o canal uma vez e ignora callbacks atrasados", async () => {
    let concluir!: (resposta: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { concluir = resolve; }));
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    estado("SUBSCRIBED");
    const sinal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    await encerrar();
    await encerrar();
    expect(sinal.aborted).toBe(true);
    concluir(Response.json(pagina));
    evento({ new: { conversation_id: conversaId } });
    estado("CLOSED");
    await Promise.resolve();
    await Promise.resolve();
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(aoAtualizar).not.toHaveBeenCalled();
    expect(aoErro).not.toHaveBeenCalled();
  });

  it.each(["TIMED_OUT", "CLOSED"])("expõe interrupção %s ao controle", (status) => {
    assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    estado(status);
    expect(aoErro).toHaveBeenCalledWith(expect.any(Error));
  });

  it("propaga erro de rede e volta a consultar após reconectar", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoErro).toHaveBeenCalledTimes(1));
    estado("SUBSCRIBED");
    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(pagina));
    await encerrar();
  });

  it("valida a conversa e usa um nome de canal diferente por assinatura", async () => {
    expect(() => assinarMensagens(supabase, { conversaId: "x", aoAtualizar, aoErro })).toThrow("Conversa inválida");
    const primeiro = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    const segundo = assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro });
    expect(channel.mock.calls[0][0]).not.toBe(channel.mock.calls[1][0]);
    await primeiro(); await segundo();
  });
});

describe("transporte HTTP do cliente", () => {
  it("envia somente conteudo com cookies do mesmo domínio", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ usuarioId: "usuario", mensagem: { id: "id" } }, { status: 201 }));
    expect(await enviarMensagemTexto(conversaId, "Olá")).toEqual({ usuarioId: "usuario", mensagem: { id: "id" } });
    expect(fetchMock).toHaveBeenCalledWith(`/api/conversas/${conversaId}/mensagens`, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conteudo: "Olá" }),
    });
  });
  it("encaminha o cursor e expõe erros HTTP sem confirmar envio", async () => {
    await listarMensagens(conversaId, { cursor: "cursor", limite: 10 });
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/conversas/${conversaId}/mensagens?limite=10&cursor=cursor`);
    fetchMock.mockResolvedValueOnce(new Response("falha", { status: 500 }));
    await expect(enviarMensagemTexto(conversaId, "Olá")).rejects.toBeInstanceOf(FalhaClienteMensagens);
  });
});
