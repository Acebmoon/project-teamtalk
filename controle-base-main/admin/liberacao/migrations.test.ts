import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";

const ator = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const alvo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const outro = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversa = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const mensagem = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
let banco: PGlite;

async function linha<T>(sql: string, parametros: unknown[] = []) {
  return (await banco.query<T>(sql, parametros)).rows[0];
}
async function operar(acao: string | null, grupo: string | null = null, usuario: string | null = null,
  nome: string | null = null, admin = ator) {
  await banco.exec("set role service_role");
  try {
    return (await linha<{ resultado: { grupo: { id: string; is_enabled: boolean }; alterado: boolean } }>(
      "select public.admin_manage_release_group($1, $2, $3, $4, null, $5) as resultado", [admin, acao, grupo, nome, usuario])).resultado;
  } finally { await banco.exec("reset role"); }
}
async function criar(nome = "Diretoria") { return (await operar("criar", null, null, nome)).grupo.id; }
async function eventos() {
  return (await banco.query<{ actor_id: string; action: string; target_user_id: string | null; details: Record<string, unknown>; created_at: unknown }>(
    "select actor_id, action, target_user_id, details, created_at from public.audit_logs order by id")).rows;
}
async function acesso(usuario = alvo) {
  await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario]);
  await banco.exec("set role authenticated");
  try {
    return await linha<{ autorizado: boolean; conversa: boolean; mensagens: number }>(`select
      public.is_active_authorized_user() as autorizado,
      public.can_access_conversation($1) as conversa,
      (select count(*)::int from public.messages) as mensagens`, [conversa]);
  } finally { await banco.exec("reset role"); }
}
beforeAll(async () => {
  banco = new PGlite();
  await banco.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', encrypted_password text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated, service_role;
    -- Simula os grants padrão do Supabase antes das restrições das migrations.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  const diretorio = new URL("../../../base(tempval)/supabase/migrations/", import.meta.url);
  for (const nome of (await readdir(diretorio)).filter((nome) => nome.endsWith(".sql")).sort())
    await banco.exec(await readFile(new URL(nome, diretorio), "utf8"));
}, 30000);
beforeEach(async () => {
  await banco.exec("reset role; truncate auth.users, public.release_groups, public.audit_logs cascade;");
  await banco.query(`insert into auth.users(id, email, encrypted_password) values
    ($1, 'ti@empresa.com', 'hash-ti'), ($2, 'ana@empresa.com', 'hash-ana'), ($3, 'bia@empresa.com', 'hash-bia')`, [ator, alvo, outro]);
  await banco.exec("update public.users set status = 'active', must_change_password = false");
  await banco.query("update public.users set role = 'it_admin' where id = $1", [ator]);
  await banco.query("insert into public.conversations(id, created_by) values ($1, $2)", [conversa, outro]);
  await banco.query("insert into public.conversation_participants(conversation_id, user_id) values ($1, $2), ($1, $3)", [conversa, alvo, outro]);
  await banco.query("insert into public.messages(id, conversation_id, sender_id, message_type, body) values ($1, $2, $3, 'text', 'Privada')", [mensagem, conversa, outro]);
});
afterAll(async () => { await banco?.close(); });

describe("grupos e auditoria nas migrations reais em PostgreSQL", () => {
  it("cria grupo desabilitado e grava ator, ação, alvo, detalhes e horário", async () => {
    const id = await criar();
    const logs = await eventos();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actor_id: ator, action: "release_group.created", target_user_id: null,
      details: { group_id: id, group_name: "Diretoria", is_enabled: false } });
    expect(logs[0].created_at).toBeTruthy();
    expect(await linha("select is_enabled from public.release_groups where id = $1", [id])).toEqual({ is_enabled: false });
  });
  it("nega usuário fora de grupo, bloqueia grupo desabilitado e revoga acesso existente na consulta seguinte", async () => {
    const id = await criar();
    expect(await acesso()).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
    await operar("incluir", id, alvo);
    expect(await acesso()).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
    await operar("habilitar", id);
    expect(await acesso()).toEqual({ autorizado: true, conversa: true, mensagens: 1 });
    expect(await acesso(outro)).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
    await operar("desabilitar", id);
    expect(await acesso()).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
    await operar("habilitar", id);
    await operar("remover", id, alvo);
    expect(await acesso()).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
    const logs = await eventos();
    expect(logs.map((evento) => evento.action)).toEqual(["release_group.created", "release_group.member_added",
      "release_group.enabled", "release_group.disabled", "release_group.enabled", "release_group.member_removed"]);
    expect(logs[1]).toMatchObject({ actor_id: ator, target_user_id: alvo, details: { group_id: id } });
    expect(logs[5]).toMatchObject({ actor_id: ator, target_user_id: alvo });
  });
  it("preserva acesso se ainda existe outro grupo habilitado", async () => {
    const primeiro = await criar("Diretoria"); const segundo = await criar("Piloto");
    for (const id of [primeiro, segundo]) { await operar("incluir", id, alvo); await operar("habilitar", id); }
    await operar("remover", primeiro, alvo);
    expect((await acesso()).autorizado).toBe(true);
    await operar("desabilitar", segundo);
    expect((await acesso()).autorizado).toBe(false);
  });
  it.each(["pending", "blocked", "disabled"])("grupo habilitado não sobrepõe status %s", async (status) => {
    const id = await criar(); await operar("incluir", id, alvo); await operar("habilitar", id);
    await banco.query("update public.users set status = $1 where id = $2", [status, alvo]);
    expect(await acesso()).toEqual({ autorizado: false, conversa: false, mensagens: 0 });
  });
  it("grupo habilitado não dispensa troca de senha nem dá acesso à TI a conversas alheias", async () => {
    const id = await criar(); await operar("incluir", id, alvo); await operar("habilitar", id);
    await banco.query("update public.users set must_change_password = true where id = $1", [alvo]);
    expect((await acesso()).conversa).toBe(false);
    expect((await acesso()).mensagens).toBe(0);
    expect(await acesso(ator)).toEqual({ autorizado: true, conversa: false, mensagens: 0 });
  });
  it("repetições são idempotentes e não reescrevem added_by nem duplicam eventos", async () => {
    const id = await criar();
    await banco.query("update public.users set role = 'it_admin' where id = $1", [outro]);
    expect((await operar("incluir", id, alvo)).alterado).toBe(true);
    expect((await operar("incluir", id, alvo, null, outro)).alterado).toBe(false);
    expect(await linha("select added_by from public.release_group_members where release_group_id = $1", [id])).toEqual({ added_by: ator });
    expect((await operar("desabilitar", id)).alterado).toBe(false);
    expect((await operar("habilitar", id)).alterado).toBe(true);
    expect((await operar("habilitar", id)).alterado).toBe(false);
    expect((await operar("remover", id, alvo)).alterado).toBe(true);
    expect((await operar("remover", id, alvo)).alterado).toBe(false);
    expect(await eventos()).toHaveLength(4);
  });
  it.each(["anon", "authenticated"])("%s não executa RPC com ator forjado nem escreve nas tabelas", async (papel) => {
    const id = await criar();
    await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [alvo]);
    await banco.exec(`set role ${papel}`);
    try {
      await expect(banco.query("select public.admin_manage_release_group($1, 'habilitar', $2)", [ator, id])).rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("update public.release_groups set is_enabled = true where id = $1", [id])).rejects.toMatchObject({ code: "42501" });
      await expect(banco.query("insert into public.release_group_members(release_group_id, user_id) values ($1, $2)", [id, alvo])).rejects.toMatchObject({ code: "42501" });
      await expect(banco.exec("delete from public.audit_logs")).rejects.toMatchObject({ code: "42501" });
      expect((await banco.query("select * from public.audit_logs")).rows).toHaveLength(0);
    } finally { await banco.exec("reset role"); }
    expect(await eventos()).toHaveLength(1);
  });
  it.each(["pending", "blocked", "disabled", "senha", "employee"])("RPC de serviço revalida ator %s", async (estado) => {
    const id = await criar();
    if (estado === "senha") await banco.query("update public.users set must_change_password = true where id = $1", [ator]);
    else if (estado === "employee") await banco.query("update public.users set role = 'employee' where id = $1", [ator]);
    else await banco.query("update public.users set status = $1 where id = $2", [estado, ator]);
    await expect(operar("habilitar", id)).rejects.toMatchObject({ code: "42501" });
    expect(await eventos()).toHaveLength(1);
  });
  it("Admin TI lê eventos de outras frentes; funcionário não lê auditoria", async () => {
    await criar();
    await banco.query("insert into public.audit_logs(actor_id, action, target_user_id) values ($1, 'account.blocked', $2)", [ator, alvo]);
    await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [ator]);
    await banco.exec("set role authenticated");
    expect((await banco.query("select * from public.audit_logs")).rows).toHaveLength(2);
    await banco.exec("reset role");
    await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [alvo]);
    await banco.exec("set role authenticated");
    expect((await banco.query("select * from public.audit_logs")).rows).toHaveLength(0);
    await banco.exec("reset role");
  });
  it("dados inválidos, nomes duplicados e referências ausentes não geram mutações parciais", async () => {
    const id = await criar();
    await expect(criar()).rejects.toMatchObject({ code: "23505" });
    await expect(operar("criar", null, null, " ")).rejects.toMatchObject({ code: "22023" });
    await expect(operar(null, id)).rejects.toMatchObject({ code: "22023" });
    await expect(operar("apagar", id)).rejects.toMatchObject({ code: "22023" });
    await expect(operar("habilitar", mensagem)).rejects.toMatchObject({ code: "P0002" });
    await expect(operar("incluir", id, mensagem)).rejects.toMatchObject({ code: "P0002" });
    expect(await eventos()).toHaveLength(1);
  });
  it.each(["criar", "habilitar", "desabilitar", "incluir", "remover"])("reverte %s integralmente quando auditoria falha", async (acao) => {
    const id = await criar();
    if (acao === "desabilitar") await operar("habilitar", id);
    if (acao === "remover") await operar("incluir", id, alvo);
    const antes = await banco.query("select to_jsonb(g) as grupo from public.release_groups g order by id");
    const membrosAntes = await banco.query("select to_jsonb(m) as membro from public.release_group_members m order by user_id");
    const logsAntes = await eventos();
    await banco.exec(`create function public.test_fail_group_audit() returns trigger language plpgsql as $$
      begin raise exception 'audit unavailable'; end $$;
      create trigger test_fail_group_audit before insert on public.audit_logs for each row execute function public.test_fail_group_audit();`);
    try {
      await expect(operar(acao, acao === "criar" ? null : id,
        acao === "incluir" || acao === "remover" ? alvo : null, acao === "criar" ? "Outro grupo" : null))
        .rejects.toThrow("audit unavailable");
      expect((await banco.query("select to_jsonb(g) as grupo from public.release_groups g order by id")).rows).toEqual(antes.rows);
      expect((await banco.query("select to_jsonb(m) as membro from public.release_group_members m order by user_id")).rows).toEqual(membrosAntes.rows);
      expect(await eventos()).toEqual(logsAntes);
    } finally {
      await banco.exec("drop trigger test_fail_group_audit on public.audit_logs; drop function public.test_fail_group_audit();");
    }
  });
});
