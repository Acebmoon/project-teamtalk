import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { exigirAdminTI } from "../auth/exigir-admin-ti";
import { listarContas, cadastrarConta, consultarConta, alterarConta } from "./api";
import { GET as estadoAdmin } from "./estado";
import { criarConta, gerirConta } from "./acoes";
import { carregarPainelAdmin, carregarContaAdmin } from "./painel";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getClaims: vi.fn(), rpc: vi.fn(), fabrica: vi.fn(), revalidar: vi.fn(),
  listar: vi.fn(), cadastrar: vi.fn(), consultar: vi.fn(), alterar: vi.fn(), from: vi.fn(),
}));
vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn(async () => ({
  auth: { getUser: mocks.getUser, getClaims: mocks.getClaims }, rpc: mocks.rpc, from: mocks.from,
})) }));
vi.mock("./servico", () => ({ criarServicoContas: mocks.fabrica }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));

const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const usuario = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "ti@empresa.com" } as User;
const contexto = { params: Promise.resolve({ id }) };
function request(method = "GET", body?: string) {
  return new Request("https://teamtalk.test/api/admin/contas", {
    method, headers: { "Content-Type": "application/json" }, body,
  });
}
function configurar({ admin = true, authorized = true, password = false, vencida = false, semUsuario = false } = {}) {
  mocks.getUser.mockResolvedValue({ data: { user: semUsuario ? null : usuario } });
  mocks.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "password", timestamp: Date.now() / 1000 - (vencida ? 86400 : 60) }] } } });
  mocks.rpc.mockResolvedValue({ data: { authorized, must_change_password: password, it_admin: admin }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks(); configurar();
  mocks.fabrica.mockReturnValue({ listar: mocks.listar, cadastrar: mocks.cadastrar, consultar: mocks.consultar, alterar: mocks.alterar });
  mocks.listar.mockResolvedValue({ contas: [], total: 0, pagina: 1, limite: 20 });
  mocks.cadastrar.mockResolvedValue({ id }); mocks.consultar.mockResolvedValue({ id }); mocks.alterar.mockResolvedValue({ id });
});

describe("RBAC real do guard e entrypoints administrativos", () => {
  it("autoriza somente admin com sessão válida e senha definitiva", async () => {
    expect(await exigirAdminTI()).toMatchObject({ usuario });
    expect(mocks.rpc).toHaveBeenCalledWith("get_access_state");
  });
  it.each([
    { opcoes: { admin: false }, status: 403 },
    { opcoes: { password: true }, status: 403 },
    { opcoes: { authorized: false }, status: 403 },
    { opcoes: { semUsuario: true }, status: 401 },
    { opcoes: { vencida: true }, status: 401 },
  ])("nega acesso por $status antes de usar service_role: $opcoes", async ({ opcoes, status }) => {
    configurar(opcoes);
    const respostas = [
      await listarContas(request()), await cadastrarConta(request("POST", "{json-invalido")),
      await consultarConta(request(), contexto), await alterarConta(request("PATCH", "{json-invalido"), contexto),
      await estadoAdmin(),
    ];
    for (const resposta of respostas) expect(resposta.status).toBe(status);
    expect(mocks.fabrica).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("falha fechada quando a RPC de acesso dá erro", async () => {
    mocks.rpc.mockResolvedValue({ data: { authorized: true, it_admin: true }, error: { code: "500" } });
    expect((await listarContas(request())).status).toBe(403);
    expect(mocks.fabrica).not.toHaveBeenCalled();
  });
  it("protege server actions invocadas diretamente por funcionário", async () => {
    configurar({ admin: false });
    expect(await criarConta({}, new FormData())).toMatchObject({ erro: expect.any(String) });
    expect(await gerirConta({}, new FormData())).toMatchObject({ erro: expect.any(String) });
    expect(mocks.fabrica).not.toHaveBeenCalled(); expect(mocks.revalidar).not.toHaveBeenCalled();
  });
  it("protege ambas as páginas antes de ler seus parâmetros", async () => {
    configurar({ admin: false });
    await expect(carregarPainelAdmin(Promise.resolve({}))).rejects.toMatchObject({ status: 403 });
    await expect(carregarContaAdmin(contexto.params)).rejects.toMatchObject({ status: 403 });
    expect(mocks.fabrica).not.toHaveBeenCalled();
  });
  it("aceita consultas e operações de TI, sem cache de resposta", async () => {
    const lista = await listarContas(request());
    expect(lista.status).toBe(200); expect(lista.headers.get("cache-control")).toBe("no-store");
    expect((await cadastrarConta(request("POST", "{}"))).status).toBe(201);
    expect((await consultarConta(request(), contexto)).status).toBe(200);
    expect((await alterarConta(request("PATCH", '{"acao":"bloquear"}'), contexto)).status).toBe(200);
    expect(mocks.alterar).toHaveBeenCalledWith(id, { acao: "bloquear" });
  });
  it("rejeita origem externa, conteúdo incompatível e JSON inválido após o guard", async () => {
    const externo = new Request("https://teamtalk.test/api/admin/contas", { method: "POST",
      headers: { origin: "https://externo.test", "content-type": "application/json" }, body: "{}" });
    expect((await cadastrarConta(externo)).status).toBe(403);
    expect((await cadastrarConta(new Request(request().url, { method: "POST", body: "{}" }))).status).toBe(415);
    expect((await cadastrarConta(request("POST", "{invalido"))).status).toBe(400);
    expect((await cadastrarConta(request("POST", JSON.stringify({ senha: "a".repeat(17000) })))).status).toBe(413);
    expect(mocks.fabrica).not.toHaveBeenCalled();
  });
  it("não devolve erros de provedor, credenciais ou o corpo da requisição", async () => {
    const segredo = "SEGREDO-NAO-EXIBIR";
    mocks.cadastrar.mockRejectedValue(new Error(segredo));
    const resposta = await cadastrarConta(request("POST", JSON.stringify({ senha: segredo })));
    expect(resposta.status).toBe(503); expect(await resposta.text()).not.toContain(segredo);
  });
  it("revalida apenas caminhos constantes ou UUID validado e nunca retorna a senha", async () => {
    const form = new FormData(); form.set("id", id); form.set("acao", "redefinir-senha"); form.set("senha", "Temporaria123!");
    const retorno = await gerirConta({}, form);
    expect(retorno.sucesso).toBeTruthy(); expect(JSON.stringify(retorno)).not.toContain("Temporaria123!");
    expect(mocks.revalidar.mock.calls).toEqual([["/admin"], [`/admin/contas/${id}`]]);
  });
});
