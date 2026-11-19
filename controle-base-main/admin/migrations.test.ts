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
