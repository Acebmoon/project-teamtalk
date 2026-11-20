import { completarInfraSupabase } from "../testes/infra-supabase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";

const ator = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const alvo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let banco: PGlite;

async function linha<T>(sql: string, params: unknown[] = []) {
  return (await banco.query<T>(sql, params)).rows[0];
}
async function perfil() {
  return linha<{ status: string; must_change_password: boolean }>("select status, must_change_password from public.users where id = $1", [alvo]);
}
async function iniciar(acao: string) {
  const resultado = await linha<{ resultado: { operacao_id: string } }>(
    "select public.admin_start_account_operation($1, $2, $3) as resultado", [ator, alvo, acao]);
  return resultado.resultado.operacao_id;
}
async function finalizar(id: string, sucesso = true) {
  return banco.query("select public.admin_finish_account_operation($1, $2, $3)", [ator, id, sucesso]);
}

beforeAll(async () => {
  banco = new PGlite();
  await banco.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', encrypted_password text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated, service_role;
  `);
  await completarInfraSupabase(banco);
  const diretorio = new URL("../../base(tempval)/supabase/migrations/", import.meta.url);
  for (const arquivo of (await readdir(diretorio)).filter((nome) => nome.endsWith(".sql")).sort())
    await banco.exec(await readFile(new URL(arquivo, diretorio), "utf8"));
  await banco.exec(`
    grant select on public.users, public.release_groups, public.release_group_members,
      public.conversations, public.conversation_participants, public.messages,
      public.message_reads, public.audit_logs to authenticated;
    grant update on public.users to authenticated;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
  `);
}, 30000);

beforeEach(async () => {
  await banco.exec("reset role; truncate auth.users, public.admin_account_operations, public.audit_logs cascade;");
  await banco.query("insert into auth.users(id, email, encrypted_password) values ($1, 'ti@empresa.com', 'hash-ti'), ($2, 'ana@empresa.com', 'hash-anterior')", [ator, alvo]);
  await banco.query("update public.users set role = 'it_admin', status = 'active', must_change_password = false where id = $1", [ator]);
  await banco.query("update public.users set status = 'active', must_change_password = false where id = $1", [alvo]);
});
afterAll(async () => { await banco?.close(); });

describe("contratos SQL de contas e auditoria (PostgreSQL em memória)", () => {
  it.each(["anon", "authenticated"])("%s não pode executar RPCs de gestão nem alterar a reserva", async (papel) => {
    await banco.exec(`set role ${papel}`);
    try {
      await expect(banco.query("select public.admin_create_account($1, $2, 'employee', 'active')", [ator, alvo]))
        .rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("select public.admin_start_account_operation($1, $2, 'bloquear')", [ator, alvo]))
        .rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("select public.admin_finish_account_operation($1, $2, true)", [ator, alvo]))
        .rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("select * from public.admin_account_operations")).rejects.toMatchObject({ code: "42501" });
    } finally { await banco.exec("reset role"); }
  });
  it("service_role autorizado confirma cadastro com marca obrigatória e auditoria", async () => {
    await banco.query("update public.users set status = 'pending', must_change_password = false where id = $1", [alvo]);
    await banco.exec("set role service_role");
    await banco.query("select public.admin_create_account($1, $2, 'employee', 'active')", [ator, alvo]);
    await banco.exec("reset role");
    expect(await perfil()).toEqual({ status: "active", must_change_password: true });
    expect(await linha("select actor_id, target_user_id, action from public.audit_logs"))
      .toEqual({ actor_id: ator, target_user_id: alvo, action: "account.created" });
  });
  it("funcionário não lê outras contas nem altera a marca de senha via RLS", async () => {
    await banco.query("update public.users set must_change_password = true where id = $1", [alvo]);
    await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [alvo]);
    await banco.exec("set role authenticated");
    try {
      expect((await banco.query("select id from public.users")).rows).toEqual([{ id: alvo }]);
      const alteracao = await banco.query("update public.users set must_change_password = false where id = $1 returning id", [alvo]);
      expect(alteracao.rows).toHaveLength(0);
    } finally { await banco.exec("reset role"); }
    expect((await perfil()).must_change_password).toBe(true);
  });
  it.each([
    { role: "employee", status: "active", must: false },
    { role: "it_admin", status: "blocked", must: false },
    { role: "it_admin", status: "active", must: true },
  ])("revalida o ator no banco: $role/$status/$must", async ({ role, status, must }) => {
    await banco.query("update public.users set role = $2, status = $3, must_change_password = $4 where id = $1", [ator, role, status, must]);
    await expect(iniciar("reativar")).rejects.toMatchObject({ code: "42501" });
    expect(await perfil()).toEqual({ status: "active", must_change_password: false });
  });
  it.each([
    { acao: "bloquear", estado: "blocked", evento: "account.blocked" },
    { acao: "desativar", estado: "disabled", evento: "account.disabled" },
    { acao: "reativar", estado: "active", evento: "account.reactivated" },
  ])("conclui $acao e audita ator/alvo", async ({ acao, estado, evento }) => {
    const id = await iniciar(acao);
    expect((await perfil()).status).toBe("blocked");
    await finalizar(id);
    expect((await perfil()).status).toBe(estado);
    expect(await linha("select actor_id, target_user_id, action from public.audit_logs order by id desc limit 1"))
      .toEqual({ actor_id: ator, target_user_id: alvo, action: evento });
    expect((await banco.query("select * from public.admin_account_operations")).rows).toHaveLength(0);
  });
  it.each(["pending", "active", "blocked", "disabled"])("redefine senha de %s após o trigger sem janela de acesso", async (estado) => {
    await banco.query("update public.users set status = $2 where id = $1", [alvo, estado]);
    const id = await iniciar("redefinir-senha");
    await banco.query("update auth.users set encrypted_password = 'hash-novo' where id = $1", [alvo]);
    // O trigger existente realmente zera a marca; a conta permanece sem acesso.
    expect(await perfil()).toEqual({ status: "blocked", must_change_password: false });
    await finalizar(id);
    expect(await perfil()).toEqual({ status: estado, must_change_password: true });
    const logs = await banco.query("select * from public.audit_logs");
    expect(JSON.stringify(logs.rows)).not.toContain("hash-novo");
    expect(logs.rows).toHaveLength(2);
  });
  it("serializa operações por alvo e impede autogestão", async () => {
    const id = await iniciar("redefinir-senha");
    await expect(iniciar("reativar")).rejects.toMatchObject({ code: "55P03" });
    await expect(banco.query("select public.admin_start_account_operation($1, $1, 'desativar')", [ator]))
      .rejects.toMatchObject({ code: "22023" });
    await finalizar(id);
  });
  it("deixa conta bloqueada em falha definitiva do Auth e registra falha", async () => {
    const id = await iniciar("redefinir-senha");
    await finalizar(id, false);
    expect(await perfil()).toEqual({ status: "blocked", must_change_password: true });
    expect(await linha("select action from public.audit_logs order by id desc limit 1"))
      .toEqual({ action: "account.operation_failed" });
  });
  it("RLS revoga privilégios inclusive de JWT já emitido ao bloquear a conta", async () => {
    await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [alvo]);
    // Como Admin TI válido, o alvo tem autorização sem depender de grupo de liberação.
    await banco.query("update public.users set role = 'it_admin' where id = $1", [alvo]);
    expect(await linha("select public.is_active_authorized_user() as autorizado")).toEqual({ autorizado: true });
    await iniciar("bloquear");
    expect(await linha("select public.is_active_authorized_user() as autorizado")).toEqual({ autorizado: false });
    expect(await linha("select public.is_active_it_admin() as admin")).toEqual({ admin: false });
  });
  it("faz rollback de estado e finalização se a auditoria falhar", async () => {
    const id = await iniciar("reativar");
    await banco.exec(`
      create function public.test_audit_failure() returns trigger language plpgsql as $$
        begin raise exception 'audit unavailable'; end; $$;
      create trigger test_audit_failure before insert on public.audit_logs for each row execute function public.test_audit_failure();
    `);
    try {
      await expect(finalizar(id)).rejects.toThrow("audit unavailable");
      expect((await perfil()).status).toBe("blocked");
      expect((await banco.query("select * from public.admin_account_operations")).rows).toHaveLength(1);
    } finally {
      await banco.exec("drop trigger test_audit_failure on public.audit_logs; drop function public.test_audit_failure();");
    }
    await finalizar(id);
    expect((await perfil()).status).toBe("active");
  });
});

async function prepararEmail(operacao: string | null = null, horas = 24) {
  const linhaEntrega = await linha<{ entrega: { id: string; expires_at: string } }>(
    "select public.admin_prepare_initial_email($1, $2, $3, $4) as entrega", [ator, alvo, operacao, horas]);
  return linhaEntrega.entrega;
}
async function confirmarEmail(id: string, sucesso = true) {
  return banco.query("select public.admin_finish_initial_email($1, $2, $3)", [ator, id, sucesso]);
}
async function estadoEntrega() {
  return linha<{ state: string }>("select state from public.initial_access_deliveries where target_user_id = $1", [alvo]);
}
async function simularSenha(hash: string) {
  return banco.query("update auth.users set encrypted_password = $2 where id = $1", [alvo, hash]);
}
async function cadastroPendente() {
  await banco.query("update public.users set status = 'pending' where id = $1", [alvo]);
  return prepararEmail();
}
async function permitirAlvo() {
  await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [alvo]);
  await banco.query("update public.users set role = 'it_admin' where id = $1", [alvo]);
}

describe("SQL real de validade, uso inicial e auditoria sanitizada", () => {
  it.each(["anon", "authenticated"])("%s não prepara/confirma entrega nem lê os metadados privados", async (papel) => {
    await banco.exec(`set role ${papel}`);
    try {
      await expect(prepararEmail()).rejects.toMatchObject({ code: "42501" });
      await expect(confirmarEmail(alvo)).rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("select * from public.initial_access_deliveries")).rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("select public.initial_access_allowed($1)", [alvo])).rejects.toMatchObject({ code: "42501" });
    } finally { await banco.exec("reset role"); }
  });
  it("revalida Admin TI no banco sem confiar no actor_id fornecido", async () => {
    await banco.query("update public.users set role = 'employee' where id = $1", [ator]);
    await expect(cadastroPendente()).rejects.toMatchObject({ code: "42501" });
    expect(await estadoEntrega()).toBeUndefined();
  });
  it("cadastro aguarda envio auditado com prazo padrão e mantém troca obrigatória", async () => {
    await banco.query("update public.users set status = 'pending' where id = $1", [alvo]);
    await banco.exec("set role service_role");
    const entrega = await prepararEmail();
    await banco.query("select public.admin_create_account($1, $2, 'it_admin', 'active')", [ator, alvo]);
    await banco.exec("reset role");
    await permitirAlvo();
    expect(await perfil()).toEqual({ status: "active", must_change_password: true });
    expect(await linha("select public.is_active_authorized_user() as autorizado")).toEqual({ autorizado: false });
    const prazo = await linha<{ horas: number }>("select extract(epoch from expires_at - created_at)/3600 as horas from public.initial_access_deliveries");
    expect(Number(prazo.horas)).toBe(24);
    await banco.exec("set role service_role"); await confirmarEmail(entrega.id); await banco.exec("reset role");
    expect(await estadoEntrega()).toEqual({ state: "sent" });
    expect(await perfil()).toEqual({ status: "active", must_change_password: true });
    expect(await linha("select public.get_access_state() as estado")).toEqual({ estado: { authorized: true, must_change_password: true, it_admin: false } });
    const auditoria = await banco.query("select actor_id, target_user_id, action, details from public.audit_logs order by id");
    expect(auditoria.rows).toContainEqual({ actor_id: ator, target_user_id: alvo, action: "initial_access.email_sent", details: { delivery_id: entrega.id } });
    expect(JSON.stringify(auditoria.rows)).not.toMatch(/hash-anterior|"(?:password|token|senha)"\s*:|https?:/);
    expect((await banco.query("select * from public.initial_access_deliveries")).rows[0])
      .toEqual(expect.objectContaining({ target_user_id: alvo, actor_id: ator, state: "sent" }));
  });
  it.each(["pending", "active", "blocked", "disabled"])("redefinição em %s repõe a marca APÓS o trigger e antes do e-mail", async (status) => {
    await banco.query("update public.users set status = $2 where id = $1", [alvo, status]);
    const operacao = await iniciar("redefinir-senha");
    await simularSenha("hash-temporario-EMAIL-83");
    expect(await perfil()).toEqual({ status: "blocked", must_change_password: false });
    const entrega = await prepararEmail(operacao);
    expect(await perfil()).toEqual({ status: "blocked", must_change_password: true });
    await expect(finalizar(operacao)).rejects.toMatchObject({ code: "55P03" });
    await confirmarEmail(entrega.id); await finalizar(operacao);
    expect(await perfil()).toEqual({ status, must_change_password: true });
    const auditoria = await banco.query("select * from public.audit_logs");
    expect(JSON.stringify(auditoria.rows)).not.toContain("hash-temporario-EMAIL-83");
  });
  it("expiração nega RLS e troca direta no Auth inclusive com sessão já emitida", async () => {
    const entrega = await cadastroPendente();
    await banco.query("select public.admin_create_account($1, $2, 'it_admin', 'active')", [ator, alvo]);
    await confirmarEmail(entrega.id); await permitirAlvo();
    await banco.query("update public.initial_access_deliveries set expires_at = now() - interval '1 second'");
    expect(await linha("select public.get_access_state() as estado")).toEqual({ estado: { authorized: false, must_change_password: true, it_admin: false } });
    await expect(simularSenha("hash-apos-expiracao")).rejects.toMatchObject({ code: "42501" });
    expect((await perfil()).must_change_password).toBe(true);
    expect(await estadoEntrega()).toEqual({ state: "sent" });
  });
  it("consome a credencial apenas na troca definitiva e libera chat; expiração posterior não revoga a senha nova", async () => {
    const entrega = await cadastroPendente();
    await banco.query("select public.admin_create_account($1, $2, 'it_admin', 'active')", [ator, alvo]);
    await confirmarEmail(entrega.id); await permitirAlvo();
    const conversa = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await banco.query("insert into public.conversations(id, type) values($1, 'direct')", [conversa]);
    await banco.query("insert into public.conversation_participants(conversation_id, user_id) values($1, $2)", [conversa, alvo]);
    expect(await linha("select public.can_access_conversation($1) as chat", [conversa])).toEqual({ chat: false });
    await simularSenha("hash-definitivo");
    expect(await estadoEntrega()).toEqual({ state: "used" }); expect((await perfil()).must_change_password).toBe(false);
    expect(await linha("select public.can_access_conversation($1) as chat", [conversa])).toEqual({ chat: true });
    await banco.query("update public.initial_access_deliveries set expires_at = now() - interval '1 day'");
    await simularSenha("hash-definitivo-seguinte");
    expect(await linha("select public.is_active_authorized_user() as autorizado")).toEqual({ autorizado: true });
  });
  it("falha do provedor permanece sem acesso, impede troca direta e permite nova redefinição TI", async () => {
    const operacao = await iniciar("redefinir-senha"); await simularSenha("hash-email-falhou");
    const entrega = await prepararEmail(operacao); await confirmarEmail(entrega.id, false); await finalizar(operacao, false);
    await permitirAlvo();
    expect(await perfil()).toEqual({ status: "blocked", must_change_password: true });
    expect(await estadoEntrega()).toEqual({ state: "failed" });
    await expect(simularSenha("hash-nao-autorizado")).rejects.toMatchObject({ code: "42501" });
    const novaOperacao = await iniciar("redefinir-senha"); await simularSenha("hash-tentativa-nova");
    const novaEntrega = await prepararEmail(novaOperacao);
    expect(novaEntrega.id).not.toBe(entrega.id);
    await expect(confirmarEmail(entrega.id)).rejects.toMatchObject({ code: "P0002" });
    await confirmarEmail(novaEntrega.id); await finalizar(novaOperacao);
    expect((await perfil()).must_change_password).toBe(true);
  });
  it("entrega pendente impede reativação/reenvio concorrente e troca direta da senha", async () => {
    await cadastroPendente();
    await expect(iniciar("reativar")).rejects.toMatchObject({ code: "55P03" });
    await expect(prepararEmail()).rejects.toMatchObject({ code: "55P03" });
    await expect(simularSenha("hash-durante-envio")).rejects.toMatchObject({ code: "42501" });
  });
  it.each([0, 169, 1.5, null])("recusa validade fora da política também no banco: %s", async (horas) => {
    await banco.query("update public.users set status = 'pending' where id = $1", [alvo]);
    await expect(banco.query("select public.admin_prepare_initial_email($1, $2, null, $3)", [ator, alvo, horas])).rejects.toThrow();
    expect(await estadoEntrega()).toBeUndefined();
  });
  it("auditoria de entrega e liberação são atômicas: erro retém bloqueio e reserva", async () => {
    const operacao = await iniciar("redefinir-senha"); await simularSenha("hash-novo");
    const entrega = await prepararEmail(operacao);
    await banco.exec(`create function public.email_test_audit_failure() returns trigger language plpgsql as $$
      begin raise exception 'audit unavailable'; end; $$;
      create trigger email_test_audit_failure before insert on public.audit_logs
      for each row execute function public.email_test_audit_failure();`);
    try {
      await expect(confirmarEmail(entrega.id)).rejects.toThrow("audit unavailable");
      expect(await estadoEntrega()).toEqual({ state: "pending" });
      expect(await perfil()).toEqual({ status: "blocked", must_change_password: true });
      expect((await banco.query("select * from public.admin_account_operations")).rows).toHaveLength(1);
    } finally {
      await banco.exec("drop trigger email_test_audit_failure on public.audit_logs; drop function public.email_test_audit_failure();");
    }
    await confirmarEmail(entrega.id); await finalizar(operacao);
  });
});
