import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarServidor } from "../supabase/servidor";
import { GET, POST } from "./mensagens";
import { codificarCursorMensagens, lerPaginacaoMensagens } from "./paginacao-mensagens";

vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn() }));

const usuarioId = "00000000-0000-0000-0000-000000000001";
const outroId = "00000000-0000-0000-0000-000000000002";
const conversaId = "00000000-0000-0000-0000-000000000079";
const outraConversa = "00000000-0000-0000-0000-000000000078";
const criadaEm = "2026-11-19T12:30:15.123456+00:00";
const agora = new Date("2026-11-19T15:00:00Z");

function linha(id = "00000000-0000-0000-0000-000000000003") {
  return {
    id, conversation_id: conversaId, sender_id: usuarioId, message_type: "text",
    body: "Olá", attachment_name: null, created_at: criadaEm, edited_at: null,
  };
}

const getUser = vi.fn();
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
const membro = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
const consulta = {
  select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(),
  insert: vi.fn(), single: vi.fn(),
};
let estado: { authorized: boolean; must_change_password: boolean; it_admin: boolean };
let permitido: boolean;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(agora);
  vi.stubEnv("SESSAO_MAX_HORAS", "12");
  estado = { authorized: true, must_change_password: false, it_admin: false };
  permitido = true;
  getUser.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
  getClaims.mockResolvedValue({ data: { claims: { amr: [
    { method: "password", timestamp: agora.getTime() / 1000 - 60 },
  ] } } });
  rpc.mockImplementation(async (nome: string) => {
    if (nome === "get_access_state") return { data: estado, error: null };
    if (nome === "can_access_conversation") return { data: permitido, error: null };
    throw new Error(`RPC inesperada: ${nome}`);
  });
  membro.select.mockReturnValue(membro);
  membro.eq.mockReturnValue(membro);
  membro.maybeSingle.mockResolvedValue({ data: { user_id: usuarioId }, error: null });
  for (const nome of ["select", "eq", "or", "order", "insert"] as const)
    consulta[nome].mockReturnValue(consulta);
  consulta.limit.mockResolvedValue({ data: [linha()], error: null });
  consulta.single.mockResolvedValue({ data: linha(), error: null });
  from.mockImplementation((tabela) => {
    if (tabela === "conversation_participants") return membro;
    if (tabela === "messages") return consulta;
    throw new Error(`Tabela inesperada: ${tabela}`);
  });
  vi.mocked(criarServidor).mockResolvedValue({ auth: { getUser, getClaims }, rpc, from } as unknown as SupabaseClient);
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

const contexto = (id = conversaId) => ({ params: Promise.resolve({ conversaId: id }) });
const get = (busca = "") => GET(new Request(`https://teamtalk.test/api/conversas/${conversaId}/mensagens${busca}`), contexto());
const post = (entrada: unknown = { conteudo: "Olá" }) => POST(new Request(
  `https://teamtalk.test/api/conversas/${conversaId}/mensagens`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entrada),
  }), contexto());

describe("API de histórico e envio de texto", () => {
  it("envia como o usuário autenticado, com payload coerente com a constraint", async () => {
    const resposta = await post({ conteudo: "  Olá  " });
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.json()).toEqual({ usuarioId, mensagem: {
      id: linha().id, conversaId, remetenteId: usuarioId, tipo: "text", conteudo: "Olá",
      nomeArquivo: null, criadaEm, editadaEm: null,
    } });
    expect(rpc).toHaveBeenCalledWith("get_access_state");
    expect(rpc).toHaveBeenCalledWith("can_access_conversation", { p_conversation_id: conversaId });
    expect(membro.eq.mock.calls).toEqual([["conversation_id", conversaId], ["user_id", usuarioId]]);
    expect(consulta.insert).toHaveBeenCalledWith({
      conversation_id: conversaId, sender_id: usuarioId, message_type: "text", body: "Olá",
      attachment_path: null, attachment_name: null,
    });
  });

  it("lista o histórico em ordem cronológica com cursor para mensagens anteriores", async () => {
    const maisAntiga = { ...linha("00000000-0000-0000-0000-000000000002"), sender_id: outroId };
    consulta.limit.mockResolvedValue({ data: [linha(), maisAntiga, linha(outroId)], error: null });
    const resposta = await get("?limite=2");
    const pagina = await resposta.json();
    expect(pagina.mensagens.map((m: { id: string }) => m.id)).toEqual([maisAntiga.id, linha().id]);
    expect(pagina.usuarioId).toBe(usuarioId);
    expect(pagina.conversaId).toBe(conversaId);
    expect(lerPaginacaoMensagens(new URLSearchParams({ cursor: pagina.paginacao.proximoCursor }))?.cursor)
      .toEqual({ id: maisAntiga.id, criadaEm });
    expect(consulta.eq).toHaveBeenCalledWith("conversation_id", conversaId);
    expect(consulta.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(consulta.limit).toHaveBeenCalledWith(3);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("preserva microssegundos na consulta de continuação", async () => {
    const cursor = codificarCursorMensagens({ criadaEm, id: linha().id });
    await get(`?cursor=${cursor}`);
    expect(consulta.or).toHaveBeenCalledWith(`created_at.lt.${criadaEm},and(created_at.eq.${criadaEm},id.lt.${linha().id})`);
  });

  it("aceita histórico vazio e PDF sem publicar o caminho do anexo", async () => {
    consulta.limit.mockResolvedValueOnce({ data: [], error: null });
    expect(await (await get()).json()).toEqual({ usuarioId, conversaId, mensagens: [], paginacao: { limite: 20, proximoCursor: null } });
    consulta.limit.mockResolvedValueOnce({ data: [{ ...linha(), message_type: "pdf", body: null,
      attachment_name: "Ata.pdf", attachment_path: "privado/ata.pdf" }], error: null });
    const corpo = await (await get()).json();
    expect(corpo.mensagens[0]).toMatchObject({ tipo: "pdf", conteudo: null, nomeArquivo: "Ata.pdf" });
    expect(JSON.stringify(corpo)).not.toContain("privado/ata.pdf");
  });

  for (const [metodo, chamar] of [["GET", get], ["POST", post]] as const) {
    it(`${metodo} exige sessão mesmo em chamada direta`, async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      expect((await chamar()).status).toBe(401);
      expect(from).not.toHaveBeenCalled();
    });
    it(`${metodo} rejeita sessão vencida com senha pendente`, async () => {
      estado.must_change_password = true;
      getClaims.mockResolvedValue({ data: { claims: { amr: [
        { method: "password", timestamp: agora.getTime() / 1000 - 12 * 3600 },
      ] } } });
      expect((await chamar()).status).toBe(401);
      expect(from).not.toHaveBeenCalled();
    });
    it(`${metodo} rejeita token sem comprovação de login`, async () => {
      getClaims.mockResolvedValue({ data: null, error: new Error("token inválido") });
      expect((await chamar()).status).toBe(401);
      expect(from).not.toHaveBeenCalled();
    });
    it.each([false, true])(`${metodo} bloqueia conta negada, Admin TI %s`, async (admin) => {
      estado.authorized = false; estado.it_admin = admin;
      expect((await chamar()).status).toBe(403);
      expect(from).not.toHaveBeenCalled();
    });
    it.each([false, true])(`${metodo} bloqueia must_change_password, Admin TI %s`, async (admin) => {
      estado.must_change_password = true; estado.it_admin = admin;
      expect((await chamar()).status).toBe(403);
      expect(from).not.toHaveBeenCalled();
    });
    it.each([false, true])(`${metodo} rejeita conversa alheia, Admin TI %s`, async (admin) => {
      estado.it_admin = admin; permitido = false;
      expect((await chamar()).status).toBe(403);
      expect(from).not.toHaveBeenCalled();
    });
    it(`${metodo} confere participação explícita no servidor`, async () => {
      membro.maybeSingle.mockResolvedValue({ data: { user_id: outroId }, error: null });
      expect((await chamar()).status).toBe(403);
      expect(from).not.toHaveBeenCalledWith("messages");
    });
  }

  it.each(["", "   ", "\t\n", "\u00a0", "a".repeat(4001), "😀".repeat(2001), "Olá\0"])(
    "rejeita texto vazio, longo ou inválido (%#)", async (conteudo) => {
      expect((await post({ conteudo })).status).toBe(400);
      expect(consulta.insert).not.toHaveBeenCalled();
    },
  );
  it.each([null, [], {}, { conteudo: 42 }, { conteudo: "Olá", sender_id: outroId },
    { conteudo: "Olá", remetenteId: usuarioId }, { conteudo: "Olá", attachment_path: "x" }])(
    "rejeita formato inválido ou tentativa de definir remetente/anexo (%#)", async (entrada) => {
      expect((await post(entrada)).status).toBe(400);
      expect(consulta.insert).not.toHaveBeenCalled();
    },
  );
  it("aceita o limite de 4000 unidades UTF-16 usado pela interface mobile", async () => {
    expect((await post({ conteudo: "a".repeat(4000) })).status).toBe(201);
    expect(consulta.insert.mock.calls[0][0].body).toHaveLength(4000);
  });
  it("valida tipo de conteúdo, JSON e identificador da conversa", async () => {
    const url = "https://teamtalk.test/api/conversas/x/mensagens";
    expect((await POST(new Request(url, { method: "POST", body: "{}" }), contexto())).status).toBe(415);
    expect((await POST(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), contexto())).status).toBe(400);
    expect((await GET(new Request(url), contexto("id-inválido"))).status).toBe(400);
    expect(consulta.insert).not.toHaveBeenCalled();
  });
  it.each(["?limite=51", "?usuarioId=outro", "?limite=1&limite=2", "?cursor=invalid"])(
    "recusa seletores de usuário e paginação inválida: %s", async (busca) => {
      expect((await get(busca)).status).toBe(400);
      expect(from).not.toHaveBeenCalled();
    },
  );
  it("revalida revogação da participação no INSERT", async () => {
    consulta.single.mockResolvedValue({ data: null, error: { code: "42501", message: "RLS" } });
    expect((await post()).status).toBe(403);
  });
  it("oculta erros de autorização/consulta/persistência", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "detalhe interno" } });
    expect((await post()).status).toBe(403);
    consulta.limit.mockResolvedValue({ data: null, error: { message: "detalhe SQL" } });
    const resposta = await get();
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ erro: "Não foi possível processar as mensagens." });
    consulta.single.mockResolvedValue({ data: null, error: { code: "XX000", message: "segredo" } });
    expect(await (await post()).json()).toEqual({ erro: "Não foi possível processar as mensagens." });
  });
  it("não devolve mensagens de outra conversa nem remetente inconsistente após INSERT", async () => {
    consulta.limit.mockResolvedValue({ data: [linha(), { ...linha(), conversation_id: outraConversa }], error: null });
    expect((await get("?limite=1")).status).toBe(500);
    consulta.single.mockResolvedValue({ data: { ...linha(), sender_id: outroId }, error: null });
    expect((await post()).status).toBe(500);
  });
});
