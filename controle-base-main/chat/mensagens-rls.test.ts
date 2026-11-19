import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const usuario = "00000000-0000-0000-0000-000000000001";
const destinatario = "00000000-0000-0000-0000-000000000002";
const terceiro = "00000000-0000-0000-0000-000000000003";
const admin = "00000000-0000-0000-0000-000000000004";
const conversa = "00000000-0000-0000-0000-000000000079";
const alheia = "00000000-0000-0000-0000-000000000078";
const grupo = "00000000-0000-0000-0000-000000000010";
const pasta = fileURLToPath(new URL("../../base(tempval)/supabase/migrations/", import.meta.url));
let banco: PGlite;

async function preparar(publicacaoExistente: boolean) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text not null, raw_user_meta_data jsonb default '{}'::jsonb,
      encrypted_password text
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to anon, authenticated;
    -- Reproduz os grants padrão do Supabase; a migration restringe INSERT.
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  if (publicacaoExistente) await db.exec(`
    create table public.realtime_sentinel (id integer primary key);
    create publication supabase_realtime for table public.realtime_sentinel;
  `);
  for (const arquivo of (await readdir(pasta)).filter((nome) => nome.endsWith(".sql")).sort())
    await db.exec(await readFile(`${pasta}/${arquivo}`, "utf8"));
  return db;
}

beforeAll(async () => {
  banco = await preparar(true);
  for (const id of [usuario, destinatario, terceiro, admin])
    await banco.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.invalid`]);
  await banco.query("update public.users set role = 'it_admin' where id = $1", [admin]);
  await banco.query("insert into public.release_groups (id, name, is_enabled) values ($1, 'Teste chat', true)", [grupo]);
  await banco.query("insert into public.conversations (id) values ($1), ($2)", [conversa, alheia]);
  await banco.query("insert into public.conversation_participants (conversation_id, user_id) values ($1, $2)", [alheia, terceiro]);
}, 30000);

beforeEach(async () => {
  await banco.exec("reset role; truncate public.messages cascade; update public.users set status = 'active', must_change_password = false;");
  await banco.query("update public.release_groups set is_enabled = true where id = $1", [grupo]);
  await banco.query("delete from public.conversation_participants where user_id = $1", [admin]);
  for (const id of [usuario, destinatario, terceiro])
    await banco.query("insert into public.release_group_members (release_group_id, user_id) values ($1, $2) on conflict do nothing", [grupo, id]);
  for (const id of [usuario, destinatario])
    await banco.query("insert into public.conversation_participants (conversation_id, user_id) values ($1, $2) on conflict do nothing", [conversa, id]);
});
afterAll(async () => { await banco?.close(); });

async function como<T>(id: string, operacao: () => Promise<T>): Promise<T> {
  await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await banco.exec("set role authenticated");
  try { return await operacao(); }
  finally { await banco.exec("reset role"); }
}

function inserir(texto = "Olá", remetente = usuario, conversaId = conversa) {
  return banco.query(`insert into public.messages
    (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
    values ($1, $2, 'text', $3, null, null) returning *`, [conversaId, remetente, texto]);
}

describe("migrations reais: mensagens, payload, RLS e publicação", () => {
  it("persiste texto do remetente e permite a leitura pelo destinatário autorizado", async () => {
    const enviada = await como(usuario, () => inserir());
    expect(enviada.rows[0]).toMatchObject({ sender_id: usuario, conversation_id: conversa,
      message_type: "text", body: "Olá", attachment_path: null, attachment_name: null, edited_at: null });
    const recebida = await como(destinatario, () => banco.query("select * from public.messages"));
    expect(recebida.rows).toEqual(enviada.rows);
    expect((await como(terceiro, () => banco.query("select * from public.messages"))).rows).toEqual([]);
    expect((await como(admin, () => banco.query("select * from public.messages"))).rows).toEqual([]);
  });
  it("permite a resposta do destinatário com sua própria identidade", async () => {
    await como(usuario, () => inserir());
    await como(destinatario, () => inserir("Resposta", destinatario));
    expect((await como(usuario, () => banco.query("select body from public.messages order by created_at, id"))).rows)
      .toHaveLength(2);
  });
  it("rejeita remetente forjado e conversa alheia diretamente no banco", async () => {
    await expect(como(usuario, () => inserir("Forjada", destinatario))).rejects.toMatchObject({ code: "42501" });
    await expect(como(usuario, () => inserir("Alheia", usuario, alheia))).rejects.toMatchObject({ code: "42501" });
    await expect(como(admin, () => inserir("TI", admin))).rejects.toMatchObject({ code: "42501" });
    expect((await banco.query("select * from public.messages")).rows).toEqual([]);
  });
  it.each(["pending", "blocked", "disabled"])("nega leitura e escrita para conta %s", async (status) => {
    await como(destinatario, () => inserir("Privada", destinatario));
    await banco.query("update public.users set status = $1::public.user_status where id = $2", [status, usuario]);
    expect((await como(usuario, () => banco.query("select * from public.messages"))).rows).toEqual([]);
    await expect(como(usuario, () => inserir())).rejects.toMatchObject({ code: "42501" });
  });
  it.each([usuario, admin])("bloqueia must_change_password também na RLS (%s)", async (id) => {
    await banco.query("insert into public.conversation_participants (conversation_id, user_id) values ($1, $2) on conflict do nothing", [conversa, id]);
    await como(destinatario, () => inserir("Privada", destinatario));
    await banco.query("update public.users set must_change_password = true where id = $1", [id]);
    expect((await como(id, () => banco.query("select * from public.messages"))).rows).toEqual([]);
    await expect(como(id, () => inserir("Pendente", id))).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["grupo-desabilitado", "sem-grupo", "participacao-removida"])("revoga o acesso após %s", async (tipo) => {
    await como(destinatario, () => inserir("Privada", destinatario));
    if (tipo === "grupo-desabilitado") await banco.query("update public.release_groups set is_enabled = false where id = $1", [grupo]);
    if (tipo === "sem-grupo") await banco.query("delete from public.release_group_members where user_id = $1", [usuario]);
    if (tipo === "participacao-removida") await banco.query("delete from public.conversation_participants where user_id = $1", [usuario]);
    expect((await como(usuario, () => banco.query("select * from public.messages"))).rows).toEqual([]);
    await expect(como(usuario, () => inserir())).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["", "   ", "\t\n", "x".repeat(4001)])("rejeita texto vazio/longo sem passar pela API (%#)", async (texto) => {
    await expect(como(usuario, () => inserir(texto))).rejects.toMatchObject({ code: "23514" });
  });
  it("aceita 4000 caracteres e mantém a constraint de tipo e anexos", async () => {
    await como(usuario, () => inserir("x".repeat(4000)));
    await expect(como(usuario, () => banco.query(`insert into public.messages
      (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
      values ($1, $2, 'text', 'Olá', 'anexo.pdf', 'anexo.pdf')`, [conversa, usuario])))
      .rejects.toMatchObject({ code: "23514" });
    await expect(como(usuario, () => banco.query(`insert into public.messages
      (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
      values ($1, $2, 'pdf', null, 'anexo.pdf', 'anexo.pdf')`, [conversa, usuario])))
      .rejects.toMatchObject({ code: "42501" });
  });
  it("impede a definição de timestamp pelo cliente e preserva mensagens contra UPDATE/DELETE", async () => {
    await expect(como(usuario, () => banco.query(`insert into public.messages
      (conversation_id, sender_id, body, created_at) values ($1, $2, 'Futura', '2099-01-01')`, [conversa, usuario])))
      .rejects.toMatchObject({ code: "42501" });
    await como(usuario, () => inserir());
    expect((await como(usuario, () => banco.query("update public.messages set body = 'Alterada' returning id"))).rows).toEqual([]);
    expect((await como(usuario, () => banco.query("delete from public.messages returning id"))).rows).toEqual([]);
    expect((await banco.query("select body from public.messages")).rows).toEqual([{ body: "Olá" }]);
  });
  it("publica messages sem remover tabelas existentes da publicação", async () => {
    const { rows } = await banco.query(`select tablename from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename`);
    expect(rows).toEqual([{ tablename: "messages" }, { tablename: "realtime_sentinel" }]);
  });
  it("também cria a publicação quando ainda não existe", async () => {
    const local = await preparar(false);
    try {
      const { rows } = await local.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime'");
      expect(rows).toEqual([{ tablename: "messages" }]);
    } finally { await local.close(); }
  }, 30000);
});
