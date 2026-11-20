import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { criarServicoContas } from "./servico";

const m = vi.hoisted(() => ({ createUser: vi.fn(), updateUserById: vi.fn(), rpc: vi.fn(),
  insert: vi.fn(), fromAdmin: vi.fn(), fromSessao: vi.fn(), select: vi.fn(), eq: vi.fn(),
  or: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), fabrica: vi.fn(), email: vi.fn(), enviar: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./cliente", () => ({ criarClienteAdmin: m.fabrica }));
vi.mock("../email/adaptador", () => ({ criarEmailCorporativo: m.email }));
const ator = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const alvo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const op = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const entrega = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", expires_at: "2026-11-20T12:00:00.000Z" };
const conta = { id: alvo, email: "ana@empresa.com", display_name: "Ana", role: "employee", status: "active", must_change_password: true };
const cadastro = { nome: "Ana", email: "ana@empresa.com", senha: "Temporaria123!" };
const consulta = { select: m.select, eq: m.eq, or: m.or, order: m.order, range: m.range, maybeSingle: m.maybeSingle };

function servico() {
  return criarServicoContas({ usuario: { id: ator } as User,
    supabase: { from: m.fromSessao } as unknown as SupabaseClient });
}
beforeEach(() => {
  vi.resetAllMocks();
  m.fabrica.mockReturnValue({ from: m.fromAdmin, rpc: m.rpc,
    auth: { admin: { createUser: m.createUser, updateUserById: m.updateUserById } } });
  m.fromAdmin.mockReturnValue({ insert: m.insert }); m.insert.mockResolvedValue({ error: null });
  m.fromSessao.mockReturnValue(consulta);
  for (const funcao of [m.select, m.eq, m.or, m.order]) funcao.mockReturnValue(consulta);
  m.range.mockResolvedValue({ data: [conta], count: 1, error: null });
  m.maybeSingle.mockResolvedValue({ data: conta, error: null });
  m.createUser.mockResolvedValue({ data: { user: { id: alvo } }, error: null });
  m.updateUserById.mockResolvedValue({ data: { user: { id: alvo } }, error: null });
  m.rpc.mockImplementation(async (nome: string) => ({ data: nome === "admin_start_account_operation"
    ? { operacao_id: op, conta } : nome === "admin_prepare_initial_email" ? entrega : conta, error: null }));
  m.email.mockReturnValue({ validadeHoras: 24, enviar: m.enviar });
  m.enviar.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("serviço de contas", () => {
  it("lista por sessão/RLS com paginação limitada e ordenação estável", async () => {
    expect(await servico().listar({ pagina: 2, limite: 20, status: "active", busca: "ana_" }))
      .toMatchObject({ total: 1, pagina: 2, contas: [conta] });
    expect(m.range).toHaveBeenCalledWith(20, 39);
    expect(m.eq).toHaveBeenCalledWith("status", "active");
    expect(m.or).toHaveBeenCalledWith("display_name.ilike.%ana\\_%,email.ilike.%ana\\_%");
    expect(m.order.mock.calls).toEqual([["display_name"], ["id"]]);
    expect(m.fromAdmin).toHaveBeenCalledWith("audit_logs");
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ actor_id: ator, action: "account.listed" }));
  });
  it("consulta por UUID usando RLS e registra alvo", async () => {
    expect(await servico().consultar(alvo)).toEqual(conta);
    expect(m.eq).toHaveBeenCalledWith("id", alvo);
    expect(m.insert).toHaveBeenCalledWith({ actor_id: ator, action: "account.viewed", target_user_id: alvo, details: {} });
  });
  it("diferencia conta ausente de falha do banco", async () => {
    m.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(servico().consultar(alvo)).rejects.toMatchObject({ status: 404 });
    m.range.mockResolvedValue({ data: null, error: { code: "500" } });
    await expect(servico().listar({})).rejects.toMatchObject({ status: 503 });
  });
  it("cria pelo Auth Admin, depois aplica perfil/senha obrigatória e auditoria atômica", async () => {
    expect(await servico().cadastrar(cadastro)).toEqual(conta);
    expect(m.createUser).toHaveBeenCalledWith({ email: cadastro.email, password: cadastro.senha,
      email_confirm: true, ban_duration: "876000h", user_metadata: { display_name: "Ana" } });
    expect(m.rpc).toHaveBeenCalledWith("admin_create_account", {
      p_actor_id: ator, p_target_id: alvo, p_role: "employee", p_status: "pending",
    });
    expect(m.createUser.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[0]);
    expect(m.rpc).toHaveBeenCalledWith("admin_prepare_initial_email", {
      p_actor_id: ator, p_target_id: alvo, p_operation_id: null, p_validity_hours: 24,
    });
    expect(m.enviar).toHaveBeenCalledWith({ nome: conta.display_name, email: conta.email,
      senha: cadastro.senha, expiraEm: entrega.expires_at, entregaId: entrega.id });
    expect(m.rpc.mock.invocationCallOrder[1]).toBeLessThan(m.enviar.mock.invocationCallOrder[0]);
    expect(m.rpc).toHaveBeenLastCalledWith("admin_finish_initial_email", {
      p_actor_id: ator, p_delivery_id: entrega.id, p_success: true,
    });
    expect(JSON.stringify(m.insert.mock.calls)).not.toContain(cadastro.senha);
    expect(JSON.stringify(m.rpc.mock.calls)).not.toContain(cadastro.senha);
  });
  it("não cria no Auth se não puder registrar o início na auditoria", async () => {
    m.insert.mockResolvedValue({ error: { code: "500" } });
    await expect(servico().cadastrar(cadastro)).rejects.toMatchObject({ status: 503 });
    expect(m.createUser).not.toHaveBeenCalled();
  });
  it("mapeia duplicidade sem expor a mensagem do Auth", async () => {
    m.createUser.mockResolvedValue({ data: { user: null }, error: { code: "email_exists", message: cadastro.senha } });
    await expect(servico().cadastrar(cadastro)).rejects.toMatchObject({ status: 409, codigo: "duplicada" });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("restringe novo usuário se a gravação auditada falhar, sem apagá-lo", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "500" } });
    await expect(servico().cadastrar(cadastro)).rejects.toMatchObject({ codigo: "cadastro-incompleto" });
    expect(m.updateUserById).toHaveBeenCalledWith(alvo, { ban_duration: "876000h" });
    expect(m.insert).toHaveBeenLastCalledWith(expect.objectContaining({ action: "account.creation_incomplete", target_user_id: alvo }));
  });
  it.each([
    { acao: "bloquear", ban_duration: "876000h" }, { acao: "desativar", ban_duration: "876000h" },
    { acao: "reativar", ban_duration: "none" },
  ])("sincroniza $acao em ordem: bloqueio auditado → Auth → finalização auditada", async ({ acao, ban_duration }) => {
    await servico().alterar(alvo, { acao });
    expect(m.rpc.mock.calls).toEqual([
      ["admin_start_account_operation", { p_actor_id: ator, p_target_id: alvo, p_action: acao }],
      ["admin_finish_account_operation", { p_actor_id: ator, p_operation_id: op, p_success: true }],
    ]);
    expect(m.updateUserById).toHaveBeenCalledWith(alvo, { ban_duration });
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.updateUserById.mock.invocationCallOrder[0]);
    expect(m.updateUserById.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[1]);
  });
  it("redefine a senha antes de confirmar a marca obrigatória, sem pôr segredo no RPC", async () => {
    await servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha });
    expect(m.updateUserById).toHaveBeenCalledWith(alvo, { password: cadastro.senha, ban_duration: "none" });
    expect(m.updateUserById.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[1]);
    expect(m.rpc.mock.invocationCallOrder[1]).toBeLessThan(m.enviar.mock.invocationCallOrder[0]);
    expect(m.enviar.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[3]);
    expect(m.rpc).toHaveBeenLastCalledWith("admin_finish_account_operation", {
      p_actor_id: ator, p_operation_id: op, p_success: true,
    });
    expect(JSON.stringify(m.rpc.mock.calls)).not.toContain(cadastro.senha);
  });
  it("preserva banimento de conta desativada ao redefinir senha", async () => {
    m.rpc.mockResolvedValueOnce({ data: { operacao_id: op, conta: { ...conta, status: "disabled" } }, error: null });
    await servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha });
    expect(m.updateUserById).toHaveBeenCalledWith(alvo, { password: cadastro.senha, ban_duration: "876000h" });
  });
  it("bloqueia autogestão e entradas inválidas antes de chamar Auth/RPC", async () => {
    await expect(servico().alterar(ator, { acao: "bloquear" })).rejects.toMatchObject({ codigo: "propria-conta" });
    await expect(servico().cadastrar({ ...cadastro, must_change_password: false })).rejects.toMatchObject({ status: 400 });
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.createUser).not.toHaveBeenCalled();
  });
  it("não chama Auth quando outra operação detém a reserva", async () => {
    m.rpc.mockResolvedValue({ error: { code: "55P03" }, data: null });
    await expect(servico().alterar(alvo, { acao: "reativar" })).rejects.toMatchObject({ status: 409 });
    expect(m.updateUserById).not.toHaveBeenCalled();
  });
  it("registra falha definitiva do Auth sem restaurar acesso", async () => {
    m.updateUserById.mockResolvedValue({ error: { status: 422, code: "same_password" } });
    await expect(servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha })).rejects.toMatchObject({ status: 502 });
    expect(m.rpc).toHaveBeenLastCalledWith("admin_finish_account_operation", {
      p_actor_id: ator, p_operation_id: op, p_success: false,
    });
  });
  it.each([500, 429, undefined])("mantém reserva em falha incerta do Auth (%s)", async (status) => {
    m.updateUserById.mockResolvedValue({ error: { status } });
    await expect(servico().alterar(alvo, { acao: "reativar" })).rejects.toMatchObject({ status: 502 });
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["cadastro", "redefinicao"])("sanitiza falha do provedor em %s e audita somente o resultado", async (fluxo) => {
    const logs = ["log", "error", "warn", "info", "debug"] as const;
    const spies = logs.map((nome) => vi.spyOn(console, nome).mockImplementation(() => undefined));
    m.enviar.mockRejectedValue(new Error(`https://provedor.test/?token=${cadastro.senha}`));
    const executar = fluxo === "cadastro" ? servico().cadastrar(cadastro)
      : servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha });
    const erro = await executar.catch((e: Error) => e);
    expect(erro).toMatchObject({ status: 502, codigo: "email-provedor" });
    expect(String(erro)).not.toContain(cadastro.senha);
    expect(m.rpc).toHaveBeenCalledWith("admin_finish_initial_email", {
      p_actor_id: ator, p_delivery_id: entrega.id, p_success: false,
    });
    if (fluxo === "redefinicao") expect(m.rpc).toHaveBeenLastCalledWith("admin_finish_account_operation", {
      p_actor_id: ator, p_operation_id: op, p_success: false,
    });
    expect(JSON.stringify([m.rpc.mock.calls, m.insert.mock.calls, ...spies.map((s) => s.mock.calls)]))
      .not.toContain(cadastro.senha);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
  it("não altera senha nem audita cadastro quando e-mail está sem configuração", async () => {
    m.email.mockImplementation(() => { throw new Error("configuracao indisponivel"); });
    await expect(servico().cadastrar(cadastro)).rejects.toThrow("configuracao indisponivel");
    await expect(servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha })).rejects.toThrow();
    expect(m.createUser).not.toHaveBeenCalled(); expect(m.updateUserById).not.toHaveBeenCalled();
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.insert).not.toHaveBeenCalled();
  });
  it("não envia se o Auth ou o preparo auditado não confirmar", async () => {
    m.updateUserById.mockResolvedValueOnce({ error: { status: 500 } });
    await expect(servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha })).rejects.toMatchObject({ status: 502 });
    m.rpc.mockImplementationOnce(async () => ({ error: { code: "500" } }));
    await expect(servico().cadastrar(cadastro)).rejects.toMatchObject({ status: 503 });
    expect(m.enviar).not.toHaveBeenCalled();
  });
  it("retém reserva sem restaurar estado se a confirmação de entrega não for auditada", async () => {
    m.rpc.mockImplementation(async (nome: string) => ({ data: nome === "admin_start_account_operation"
      ? { operacao_id: op, conta } : entrega, error: nome === "admin_finish_initial_email" ? { code: "500" } : null }));
    await expect(servico().alterar(alvo, { acao: "redefinir-senha", senha: cadastro.senha })).rejects.toMatchObject({ status: 503 });
    expect(m.enviar).toHaveBeenCalledOnce();
    expect(m.rpc.mock.calls.some(([nome]) => nome === "admin_finish_account_operation")).toBe(false);
  });
  it("bloquear, reativar e desativar não dependem do adaptador de e-mail", async () => {
    for (const acao of ["bloquear", "reativar", "desativar"]) await servico().alterar(alvo, { acao });
    expect(m.email).not.toHaveBeenCalled(); expect(m.enviar).not.toHaveBeenCalled();
  });
});
