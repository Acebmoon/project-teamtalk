import { beforeEach, describe, expect, it, vi } from "vitest";
import { exigirAdminTI } from "../../auth/exigir-admin-ti";
import * as api from "./api";
import { GET as estadoAdmin } from "../estado";
import * as acoes from "./acoes";
import PaginaGrupos from "../../../base(tempval)/src/app/admin/grupos/page";
import PaginaGrupo from "../../../base(tempval)/src/app/admin/grupos/[id]/page";
import PaginaAuditoria from "../../../base(tempval)/src/app/admin/auditoria/page";
import LayoutAdmin from "../../../base(tempval)/src/app/admin/layout";

const mocks = vi.hoisted(() => ({ servidor: vi.fn(), avaliar: vi.fn(), servico: vi.fn(), revalidar: vi.fn() }));
vi.mock("../../supabase/servidor", () => ({ criarServidor: mocks.servidor }));
vi.mock("../../auth/verificar-sessao", () => ({ avaliarSessao: mocks.avaliar }));
vi.mock("./servico", () => ({ criarServicoLiberacao: mocks.servico }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));
vi.mock("next/navigation", () => ({
  forbidden: () => { throw new Error("HTTP 403"); },
  redirect: () => { throw new Error("LOGIN 401"); },
  notFound: () => { throw new Error("HTTP 404"); },
}));

const usuario = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const supabase = { from: vi.fn(), rpc: vi.fn() };
const contexto = { params: Promise.resolve({ id: usuario.id }) };
const negacoes = [
  { nome: "funcionário", decisao: "seguir", ehAdmin: false, codigo: 403 },
  { nome: "sem sessão", decisao: "login", ehAdmin: false, codigo: 401 },
  { nome: "sessão vencida", decisao: "sessao-vencida", ehAdmin: true, codigo: 401 },
  { nome: "senha provisória", decisao: "trocar-senha", ehAdmin: true, codigo: 403 },
  { nome: "conta bloqueada ou sem grupo", decisao: "acesso-negado", ehAdmin: true, codigo: 403 },
];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.servidor.mockResolvedValue(supabase);
  mocks.avaliar.mockResolvedValue({ decisao: "seguir", ehAdmin: true, usuario });
});

describe("RBAC direto em todos os entrypoints de liberação", () => {
  it("devolve contexto somente depois de avaliar a sessão do servidor", async () => {
    expect(await exigirAdminTI()).toEqual({ supabase, usuario });
    expect(mocks.avaliar).toHaveBeenCalledWith(supabase);
  });
  it("nega sessão inconsistente sem usuário mesmo com indicação de TI", async () => {
    mocks.avaliar.mockResolvedValue({ decisao: "seguir", ehAdmin: true, usuario: null });
    await expect(exigirAdminTI()).rejects.toMatchObject({ status: 403 });
  });
  for (const negacao of negacoes) {
    it.each(Object.entries(api))("API %s bloqueia " + negacao.nome + " antes de ler corpo ou consultar dados", async (_nome, handler) => {
      mocks.avaliar.mockResolvedValue({ ...negacao, usuario });
      const request = new Request("https://teamtalk.test/api/admin/grupos", { method: "POST", body: "JSON inválido" });
      const ler = vi.spyOn(request, "text");
      const resposta = await handler(request, contexto);
      expect(resposta.status).toBe(negacao.codigo);
      expect(resposta.headers.get("cache-control")).toBe("no-store");
      expect(mocks.servico).not.toHaveBeenCalled();
      expect(ler).not.toHaveBeenCalled();
    });
    it.each(Object.entries(acoes))("ação %s bloqueia " + negacao.nome + " em chamada direta", async (_nome, handler) => {
      mocks.avaliar.mockResolvedValue({ ...negacao, usuario });
      const formulario = new FormData();
      const ler = vi.spyOn(formulario, "get");
      expect(await handler({}, formulario)).toMatchObject({ status: negacao.codigo, erro: expect.any(String) });
      expect(ler).not.toHaveBeenCalled();
      expect(mocks.servico).not.toHaveBeenCalled();
      expect(mocks.revalidar).not.toHaveBeenCalled();
    });
    it("todas as páginas/layout bloqueiam " + negacao.nome + " antes de carregar dados", async () => {
      mocks.avaliar.mockResolvedValue({ ...negacao, usuario });
      const erro = negacao.codigo === 401 ? "LOGIN 401" : "HTTP 403";
      await expect(PaginaGrupos({ searchParams: Promise.resolve({}) })).rejects.toThrow(erro);
      await expect(PaginaGrupo({ params: contexto.params, searchParams: Promise.resolve({}) })).rejects.toThrow(erro);
      await expect(PaginaAuditoria({ searchParams: Promise.resolve({}) })).rejects.toThrow(erro);
      await expect(LayoutAdmin({ children: null })).rejects.toThrow(erro);
      expect(mocks.servico).not.toHaveBeenCalled();
    });
  }
  it("endpoint de estado preserva 401/403 sem depender do middleware", async () => {
    for (const negacao of negacoes) {
      mocks.avaliar.mockResolvedValue({ ...negacao, usuario });
      expect((await estadoAdmin()).status).toBe(negacao.codigo);
    }
  });
  it("API administrativa lê dados de TI e rejeita origem cruzada antes de mutar", async () => {
    const criar = vi.fn();
    mocks.servico.mockReturnValue({ listarGrupos: vi.fn().mockResolvedValue({ itens: [], total: 0 }), criarGrupo: criar });
    expect((await api.GETGrupos(new Request("https://teamtalk.test/api/admin/grupos"))).status).toBe(200);
    const request = new Request("https://teamtalk.test/api/admin/grupos", { method: "POST", headers: {
      origin: "https://outro.test", "content-type": "application/json",
    }, body: JSON.stringify({ nome: "Diretoria" }) });
    expect((await api.POSTGrupos(request)).status).toBe(403);
    expect(criar).not.toHaveBeenCalled();
  });
  it("ação confirma inclusão somente depois da transação auditada e invalida as telas", async () => {
    const alterar = vi.fn().mockResolvedValue({ grupo: { id: usuario.id }, alterado: true });
    mocks.servico.mockReturnValue({ alterarGrupo: alterar });
    const formulario = new FormData();
    formulario.set("acao", "incluir"); formulario.set("grupoId", usuario.id); formulario.set("usuarioId", usuario.id);
    const estado = await acoes.alterarGrupo({}, formulario);
    expect(alterar).toHaveBeenCalledWith(usuario.id, { acao: "incluir", usuarioId: usuario.id });
    expect(estado).toMatchObject({ status: 200, sucesso: expect.any(String) });
    expect(mocks.revalidar.mock.calls).toEqual([["/admin/grupos"], [`/admin/grupos/${usuario.id}`], ["/admin/auditoria"]]);
  });
  it("ação não retorna sucesso nem revalida se a transação falhar", async () => {
    mocks.servico.mockReturnValue({ criarGrupo: vi.fn().mockRejectedValue(new Error("chave interna de teste")) });
    const formulario = new FormData(); formulario.set("nome", "Diretoria");
    const estado = await acoes.criarGrupo({}, formulario);
    expect(estado.status).toBe(503);
    expect(estado.erro).not.toContain("chave interna");
    expect(estado.sucesso).toBeUndefined();
    expect(mocks.revalidar).not.toHaveBeenCalled();
  });
});
