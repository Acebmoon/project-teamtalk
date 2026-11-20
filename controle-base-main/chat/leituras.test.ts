import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "../auth/verificar-sessao";
import { GET, POST } from "./leituras";

vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn() }));
vi.mock("../auth/verificar-sessao", () => ({ avaliarSessao: vi.fn() }));

const usuario = "00000000-0000-0000-0000-000000000002";
const remetente = "00000000-0000-0000-0000-000000000001";
const outro = "00000000-0000-0000-0000-000000000003";
const conversa = "00000000-0000-0000-0000-000000000080";
const mensagem = "00000000-0000-0000-0000-000000000081";
const lidaEm = "2026-11-19T15:00:00.123456+00:00";
const rpc = vi.fn();
const from = vi.fn();
const maybeSingle = vi.fn();
const consulta = { select: vi.fn(), eq: vi.fn(), maybeSingle };
const supabase = { rpc, from } as unknown as SupabaseClient;
const status = { message_id: mensagem, conversation_id: conversa, sender_id: remetente, recipients: [
  { user_id: usuario, joined_at: "2026-11-18T00:00:00Z", read_at: lidaEm },
  { user_id: outro, joined_at: "2026-11-18T00:00:00Z", read_at: null },
] };

function contexto(conversaId = conversa, mensagemId = mensagem) {
  return { params: Promise.resolve({ conversaId, mensagemId }) };
}
function requisicao(metodo: "GET" | "POST", corpo: unknown = { exibida: true }, query = "") {
  const caminho = metodo === "GET" ? "leituras" : `mensagens/${mensagem}/leituras`;
  return new Request(`https://test.invalid/api/conversas/${conversa}/${caminho}${query}`, {
    method: metodo, ...(metodo === "POST" ? {
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
    } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(criarServidor).mockResolvedValue(supabase);
  vi.mocked(avaliarSessao).mockResolvedValue({ decisao: "seguir", usuario: { id: usuario }, ehAdmin: false } as Awaited<ReturnType<typeof avaliarSessao>>);
  from.mockReturnValue(consulta);
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  maybeSingle.mockResolvedValue({ data: { user_id: usuario }, error: null });
  rpc.mockImplementation(async (nome) => ({ error: null, data:
    nome === "can_access_conversation" ? true : nome === "get_message_read_status" ? [status]
      : [{ message_id: mensagem, user_id: usuario, read_at: lidaEm }],
  }));
});

describe("API de leituras: identidade, autorização e contrato", () => {
  it("registra somente o usuário autenticado, sem receber identidade ou horário", async () => {
    const resposta = await POST(requisicao("POST"), contexto());
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.json()).toEqual({ usuarioId: usuario, conversaId: conversa,
      leitura: { mensagemId: mensagem, usuarioId: usuario, lidaEm } });
    expect(criarServidor).toHaveBeenCalledOnce();
    expect(avaliarSessao).toHaveBeenCalledWith(supabase);
    expect(rpc).toHaveBeenLastCalledWith("register_message_read", { p_conversation_id: conversa, p_message_id: mensagem });
    expect(consulta.eq).toHaveBeenCalledWith("user_id", usuario);
  });
  it("repete a confirmação com o mesmo recibo e o mesmo horário", async () => {
    const primeira = await (await POST(requisicao("POST"), contexto())).json();
    const segunda = await (await POST(requisicao("POST"), contexto())).json();
    expect(segunda).toEqual(primeira);
  });
  it("consulta o status individual, sem marcar o outro destinatário nem emitir escrita", async () => {
    const resposta = await GET(requisicao("GET", null, `?mensagemId=${mensagem}`), contexto());
    expect(await resposta.json()).toEqual({ usuarioId: usuario, conversaId: conversa, mensagens: [{
      mensagemId: mensagem, remetenteId: remetente, destinatarios: [
        { usuarioId: usuario, entrouEm: "2026-11-18T00:00:00Z", lidaEm },
        { usuarioId: outro, entrouEm: "2026-11-18T00:00:00Z", lidaEm: null },
      ],
    }] });
    expect(rpc.mock.calls.some(([nome]) => nome === "register_message_read")).toBe(false);
  });
  it.each(["login", "sessao-vencida", "acesso-negado", "trocar-senha"] as const)("bloqueia GET e POST antes do banco: %s", async (decisao) => {
    vi.mocked(avaliarSessao).mockResolvedValue({ decisao, usuario: { id: usuario }, ehAdmin: true } as Awaited<ReturnType<typeof avaliarSessao>>);
    const codigo = decisao === "login" || decisao === "sessao-vencida" ? 401 : 403;
    expect((await POST(requisicao("POST"), contexto())).status).toBe(codigo);
    expect((await GET(requisicao("GET", null, `?mensagemId=${mensagem}`), contexto())).status).toBe(codigo);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
  it("nega ausência de usuário mesmo com decisão inconsistente", async () => {
    vi.mocked(avaliarSessao).mockResolvedValue({ decisao: "seguir", usuario: null, ehAdmin: false } as unknown as Awaited<ReturnType<typeof avaliarSessao>>);
    expect((await POST(requisicao("POST"), contexto())).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("nega conversa alheia para GET e POST, inclusive Admin TI", async () => {
    vi.mocked(avaliarSessao).mockResolvedValue({ decisao: "seguir", usuario: { id: usuario }, ehAdmin: true } as Awaited<ReturnType<typeof avaliarSessao>>);
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(requisicao("POST"), contexto())).status).toBe(403);
    expect((await GET(requisicao("GET", null, `?mensagemId=${mensagem}`), contexto())).status).toBe(403);
    expect(rpc.mock.calls.every(([nome]) => nome === "can_access_conversation")).toBe(true);
  });
  it("confere a participação explícita além da função de acesso", async () => {
    maybeSingle.mockResolvedValue({ data: { user_id: outro }, error: null });
    expect((await POST(requisicao("POST"), contexto())).status).toBe(403);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["GET", "POST"] as const)("reaplica a autorização na RPC de %s após revogação", async (metodo) => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: { code: "42501", message: "private detail" } });
    const resposta = await (metodo === "POST" ? POST(requisicao(metodo), contexto())
      : GET(requisicao(metodo, null, `?mensagemId=${mensagem}`), contexto()));
    expect(resposta.status).toBe(403);
    expect(await resposta.text()).not.toContain("private detail");
  });
  it.each([null, [], {}, { exibida: false }, { exibida: "true" }, { exibida: true, usuarioId: outro },
    { exibida: true, user_id: outro }, { exibida: true, read_at: lidaEm }])("rejeita exibição ausente ou campos forjados: %j", async (corpo) => {
    expect((await POST(requisicao("POST", corpo), contexto())).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejeita mídia inadequada, JSON inválido e parâmetros no POST", async () => {
    expect((await POST(new Request("https://test.invalid", { method: "POST", body: "exibida" }), contexto())).status).toBe(415);
    expect((await POST(new Request("https://test.invalid", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), contexto())).status).toBe(400);
    expect((await POST(requisicao("POST", { exibida: true }, "?usuarioId=outro"), contexto())).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejeita UUIDs inválidos antes de chamar o banco", async () => {
    expect((await POST(requisicao("POST"), contexto("outra"))).status).toBe(400);
    expect((await POST(requisicao("POST"), contexto(conversa, "x"))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["", "?mensagemId=x", `?mensagemId=${mensagem}&mensagemId=${mensagem}`, `?mensagemId=${mensagem}&usuarioId=x`,
    `?${Array.from({ length: 51 }, (_, i) => `mensagemId=00000000-0000-0000-0000-${String(i).padStart(12, "0")}`).join("&")}`,
  ])("rejeita lote inválido: %s", async (query) => {
    expect((await GET(requisicao("GET", null, query), contexto())).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("não entrega resposta de recibo com identidade incompatível", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ message_id: mensagem, user_id: outro, read_at: lidaEm }], error: null });
    expect((await POST(requisicao("POST"), contexto())).status).toBe(500);
  });
  it.each([[], [{ ...status, conversation_id: outro }], [{ ...status, message_id: outro }], [status, status]].map((data) => ({ data })))("não entrega mensagens ausentes, repetidas ou de outra conversa (%#)", async ({ data }) => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data, error: null });
    expect((await GET(requisicao("GET", null, `?mensagemId=${mensagem}`), contexto())).status).toBe(500);
  });
  it("não expõe falhas internas de infraestrutura", async () => {
    vi.mocked(criarServidor).mockRejectedValue(new Error("credencial privada"));
    const resposta = await POST(requisicao("POST"), contexto());
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ erro: "Não foi possível processar as leituras." });
  });
});
