import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AcessoAdminTI } from "../../auth/exigir-admin-ti";
import { criarServicoLiberacao } from "./servico";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../cliente", () => ({ criarClienteAdmin: mocks.cliente }));
const ator = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const grupo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const alvo = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const acesso = { usuario: { id: ator }, supabase: { from: mocks.from } } as unknown as AcessoAdminTI;

function consulta(resultado: unknown) {
  const builder = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(),
    range: vi.fn().mockResolvedValue(resultado), maybeSingle: vi.fn().mockResolvedValue(resultado) };
  for (const funcao of [builder.select, builder.eq, builder.or, builder.gte, builder.lte, builder.order]) funcao.mockReturnValue(builder);
  mocks.from.mockReturnValue(builder);
  return builder;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.cliente.mockReturnValue({ rpc: mocks.rpc });
});
describe("serviço de grupos e consulta de auditoria", () => {
  it("cria desabilitado com ator do guard e descrição normalizada em uma única RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { grupo: { id: grupo, is_enabled: false }, alterado: true }, error: null });
    const resultado = await criarServicoLiberacao(acesso).criarGrupo({ nome: " Diretoria ", descricao: " Fase 1 " });
    expect(resultado.grupo.is_enabled).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("admin_manage_release_group", {
      p_actor_id: ator, p_action: "criar", p_name: "Diretoria", p_description: "Fase 1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each(["habilitar", "desabilitar", "incluir", "remover"])("ação %s usa a mesma transação de auditoria", async (acao) => {
    mocks.rpc.mockResolvedValue({ data: { grupo: { id: grupo }, alterado: true }, error: null });
    const membro = acao === "incluir" || acao === "remover";
    await criarServicoLiberacao(acesso).alterarGrupo(grupo, { acao, ...(membro ? { usuarioId: alvo } : {}) });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_manage_release_group", {
      p_actor_id: ator, p_group_id: grupo, p_action: acao, p_user_id: membro ? alvo : null,
    });
  });
  it("expõe resultado idempotente e nunca escolhe ator pelo payload", async () => {
    mocks.rpc.mockResolvedValue({ data: { grupo: { id: grupo }, alterado: false }, error: null });
    expect((await criarServicoLiberacao(acesso).alterarGrupo(grupo, { acao: "incluir", usuarioId: alvo })).alterado).toBe(false);
    mocks.cliente.mockClear();
    await expect(criarServicoLiberacao(acesso).criarGrupo({ nome: "TI", actor_id: alvo })).rejects.toMatchObject({ status: 400 });
    await expect(criarServicoLiberacao(acesso).alterarGrupo(grupo, { acao: "habilitar", actor_id: alvo })).rejects.toMatchObject({ status: 400 });
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it.each([["42501", 403], ["P0002", 404], ["23505", 409], ["22023", 400], ["P0001", 503]])
    ("falha %s não confirma alteração nem vaza detalhes do banco", async (code, status) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "segredo do banco" } });
      const resultado = criarServicoLiberacao(acesso).alterarGrupo(grupo, { acao: "habilitar" });
      await expect(resultado).rejects.toMatchObject({ status });
      await expect(resultado).rejects.not.toHaveProperty("message", "segredo do banco");
    });
  it("lista grupos paginados por estado usando sessão/RLS, sem service_role", async () => {
    const builder = consulta({ data: [{ id: grupo }], count: 41, error: null });
    const lista = await criarServicoLiberacao(acesso).listarGrupos({ pagina: 2, limite: 20, estado: "desabilitado" });
    expect(lista).toMatchObject({ itens: [{ id: grupo }], total: 41, pagina: 2, limite: 20 });
    expect(builder.eq).toHaveBeenCalledWith("is_enabled", false);
    expect(builder.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(builder.range).toHaveBeenCalledWith(20, 39);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("consulta identifica grupo ausente e propaga falhas de RLS", async () => {
    consulta({ data: null, error: null });
    await expect(criarServicoLiberacao(acesso).consultarGrupo(grupo)).rejects.toMatchObject({ status: 404 });
    consulta({ data: null, error: { code: "42501" } });
    await expect(criarServicoLiberacao(acesso).consultarGrupo(grupo)).rejects.toMatchObject({ status: 403 });
  });
  it("membros sempre são filtrados pelo grupo autorizado, com paginação", async () => {
    const membros = consulta({ data: [{ user_id: alvo }], count: 1, error: null });
    const grupoQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: grupo }, error: null }) };
    grupoQuery.select.mockReturnValue(grupoQuery); grupoQuery.eq.mockReturnValue(grupoQuery);
    mocks.from.mockImplementation((tabela: string) => tabela === "release_groups" ? grupoQuery : membros);
    expect((await criarServicoLiberacao(acesso).listarMembros(grupo, {})).itens).toEqual([{ user_id: alvo }]);
    expect(membros.eq).toHaveBeenCalledWith("release_group_id", grupo);
    expect(membros.range).toHaveBeenCalledWith(0, 19);
  });
  it("busca usuários escapando underscore e limita os campos enviados à tela", async () => {
    const builder = consulta({ data: [], count: 0, error: null });
    await criarServicoLiberacao(acesso).listarUsuarios({ busca: "ana_ti" });
    expect(builder.select).toHaveBeenCalledWith("id,email,display_name,status", { count: "exact" });
    expect(builder.or).toHaveBeenCalledWith("display_name.ilike.%ana\\_ti%,email.ilike.%ana\\_ti%");
  });
  it("auditoria combina filtros exatos, datas e ordenação estável usando RLS", async () => {
    const evento = { id: "9007199254740993", action: "account.blocked" };
    const builder = consulta({ data: [evento], count: 50, error: null });
    const lista = await criarServicoLiberacao(acesso).listarAuditoria({ pagina: 3, limite: 10,
      acao: "account.blocked", ator, alvo, desde: "2026-11-01", ate: "2026-11-19" });
    expect(lista.itens).toEqual([evento]);
    expect(mocks.from).toHaveBeenCalledWith("audit_logs");
    expect(builder.select).toHaveBeenCalledWith("id::text,actor_id,action,target_user_id,details,created_at", { count: "exact" });
    expect(builder.eq.mock.calls).toEqual([["action", "account.blocked"], ["actor_id", ator], ["target_user_id", alvo]]);
    expect(builder.gte).toHaveBeenCalledWith("created_at", "2026-11-01T00:00:00.000Z");
    expect(builder.lte).toHaveBeenCalledWith("created_at", "2026-11-19T23:59:59.999Z");
    expect(builder.order.mock.calls).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(builder.range).toHaveBeenCalledWith(20, 29);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
});
