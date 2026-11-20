import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarServidor } from "../supabase/servidor";
import { GET } from "./listar-conversas";
import { codificarCursor, lerPaginacao } from "./paginacao";

vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn() }));

const usuarioId = "00000000-0000-0000-0000-000000000001";
const terceiroId = "00000000-0000-0000-0000-000000000002";
const conversaId = "00000000-0000-0000-0000-000000000078";
const agora = new Date("2026-11-19T15:00:00Z");
const atividadeEm = "2026-11-19T14:00:00.123456+00:00";

function linhaConversa(id = conversaId) {
  return {
    id,
    type: "direct",
    title: null,
    created_at: "2026-11-18T12:00:00Z",
    updated_at: "2026-11-18T12:00:00Z",
    activity_at: atividadeEm,
    participants: [
      { user_id: usuarioId, joined_at: "2026-11-18T12:00:00Z" },
      { user_id: terceiroId, joined_at: "2026-11-18T12:00:00Z" },
    ],
    last_message: {
      id: "00000000-0000-0000-0000-000000000079",
      sender_id: terceiroId,
      message_type: "text",
      body: "Mensagem autorizada",
      attachment_name: null,
      created_at: atividadeEm,
    },
    unread_count: 2,
  };
}

let estado: { authorized: boolean; must_change_password: boolean; it_admin: boolean };
let linhas: unknown[];
let erroConsulta: { message: string } | null;
const getUser = vi.fn();
const getClaims = vi.fn();
const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(agora);
  vi.stubEnv("SESSAO_MAX_HORAS", "12");
  estado = { authorized: true, must_change_password: false, it_admin: false };
  linhas = [linhaConversa()];
  erroConsulta = null;
  getUser.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
  getClaims.mockResolvedValue({ data: { claims: { amr: [
    { method: "password", timestamp: agora.getTime() / 1000 - 60 },
  ] } }, error: null });
  rpc.mockImplementation(async (nome: string) => {
    if (nome === "get_access_state") return { data: estado, error: null };
    if (nome === "list_authorized_conversations") return { data: linhas, error: erroConsulta };
    throw new Error(`RPC inesperada: ${nome}`);
  });
  vi.mocked(criarServidor).mockResolvedValue({
    auth: { getUser, getClaims }, rpc,
  } as unknown as SupabaseClient);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function requisicao(busca = "") {
  return new Request(`https://teamtalk.test/api/conversas${busca}`);
}

function consultasDeChat() {
  return rpc.mock.calls.filter(([nome]) => nome === "list_authorized_conversations");
}

describe("GET /api/conversas", () => {
  it("valida a sessão real e devolve o contrato com participantes e última mensagem", async () => {
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.json()).toMatchObject({
      usuarioId,
      conversas: [{
        id: conversaId,
        tipo: "direct",
        titulo: "Conversa direta",
        atividadeEm,
        participantes: [{ usuarioId }, { usuarioId: terceiroId }],
        ultimaMensagem: { tipo: "text", conteudo: "Mensagem autorizada", remetenteId: terceiroId },
        naoLidas: 2,
      }],
      paginacao: { limite: 20, proximoCursor: null },
    });
    expect(rpc).toHaveBeenCalledWith("get_access_state");
    expect(consultasDeChat()).toEqual([["list_authorized_conversations", {
      p_limit: 20, p_before_activity_at: null, p_before_id: null,
    }]]);
  });

  it("retorna 401 sem sessão e não consulta conversas", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(requisicao())).status).toBe(401);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it("retorna 401 para sessão vencida mesmo com troca de senha pendente", async () => {
    estado.must_change_password = true;
    getClaims.mockResolvedValue({ data: { claims: { amr: [
      { method: "password", timestamp: agora.getTime() / 1000 - 12 * 3600 },
    ] } }, error: null });
    expect((await GET(requisicao())).status).toBe(401);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it("retorna 401 quando o token não tem comprovação de login válida", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("token inválido") });
    expect((await GET(requisicao())).status).toBe(401);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it.each([false, true])("retorna 403 para conta negada, sendo Admin TI %s", async (admin) => {
    estado.authorized = false;
    estado.it_admin = admin;
    expect((await GET(requisicao())).status).toBe(403);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it.each([false, true])("retorna 403 com must_change_password, sendo Admin TI %s", async (admin) => {
    estado.must_change_password = true;
    estado.it_admin = admin;
    expect((await GET(requisicao())).status).toBe(403);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it("nega acesso quando a consulta de autorização falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "indisponível" } });
    expect((await GET(requisicao())).status).toBe(403);
    expect(consultasDeChat()).toHaveLength(0);
  });

  it("limita a página e produz cursor a partir do último item devolvido", async () => {
    linhas = [linhaConversa(), linhaConversa("00000000-0000-0000-0000-000000000077")];
    const resposta = await GET(requisicao("?limite=1"));
    const corpo = await resposta.json();
    expect(corpo.conversas).toHaveLength(1);
    const parametros = new URLSearchParams({ cursor: corpo.paginacao.proximoCursor });
    expect(lerPaginacao(parametros)?.cursor).toEqual({ atividadeEm, id: conversaId });
  });

  it("envia os dois campos do cursor à consulta parametrizada", async () => {
    const cursor = codificarCursor({ atividadeEm, id: conversaId });
    await GET(requisicao(`?limite=50&cursor=${cursor}`));
    expect(consultasDeChat()).toEqual([["list_authorized_conversations", {
      p_limit: 50, p_before_activity_at: atividadeEm, p_before_id: conversaId,
    }]]);
  });

  it("devolve página vazia sem fabricar próximo cursor", async () => {
    linhas = [];
    expect(await (await GET(requisicao())).json()).toEqual({
      usuarioId, conversas: [], paginacao: { limite: 20, proximoCursor: null },
    });
  });

  it("aceita conversa sem mensagens e título de grupo", async () => {
    linhas = [{ ...linhaConversa(), type: "group", title: "Equipe", last_message: null, unread_count: 0 }];
    const corpo = await (await GET(requisicao())).json();
    expect(corpo.conversas[0]).toMatchObject({ titulo: "Equipe", ultimaMensagem: null, naoLidas: 0 });
  });

  it("retorna metadados de PDF com o contrato publicado", async () => {
    const linha = linhaConversa();
    linhas = [{ ...linha, last_message: {
      ...linha.last_message, message_type: "pdf", body: null, attachment_name: "Ata.pdf",
      attachment_path: "privado/nao-expor.pdf",
    } }];
    const corpo = await (await GET(requisicao())).json();
    expect(corpo.conversas[0].ultimaMensagem).toMatchObject({ tipo: "pdf", conteudo: null, nomeArquivo: "Ata.pdf" });
    expect(JSON.stringify(corpo)).not.toContain("privado/nao-expor.pdf");
  });

  it.each([false, true])("recusa conversa de terceiros inclusive para Admin TI %s", async (admin) => {
    estado.it_admin = admin;
    linhas = [{ ...linhaConversa(), participants: [{ user_id: terceiroId, joined_at: atividadeEm }] }];
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ erro: "Não foi possível listar as conversas." });
  });

  it("recusa também linha extra de terceiros antes de produzir o cursor", async () => {
    linhas = [linhaConversa(), { ...linhaConversa(), participants: [] }];
    expect((await GET(requisicao("?limite=1"))).status).toBe(500);
  });

  it.each(["?limite=51", "?cursor=invalid", "?usuarioId=terceiro"])(
    "retorna 400 sem consultar dados para %s", async (busca) => {
      expect((await GET(requisicao(busca))).status).toBe(400);
      expect(consultasDeChat()).toHaveLength(0);
    },
  );

  it("oculta mensagens internas em erros do banco", async () => {
    erroConsulta = { message: "credencial e detalhe SQL internos" };
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ erro: "Não foi possível listar as conversas." });
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
