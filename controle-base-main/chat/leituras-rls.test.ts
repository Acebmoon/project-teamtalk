import { completarInfraSupabase } from "../testes/infra-supabase";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const autor = "00000000-0000-0000-0000-000000000001";
const primeiro = "00000000-0000-0000-0000-000000000002";
const segundo = "00000000-0000-0000-0000-000000000003";
const terceiro = "00000000-0000-0000-0000-000000000004";
const admin = "00000000-0000-0000-0000-000000000005";
const grupo = "00000000-0000-0000-0000-000000000010";
const conversa = "00000000-0000-0000-0000-000000000080";
const alheia = "00000000-0000-0000-0000-000000000082";
const mensagem = "00000000-0000-0000-0000-000000000081";
const pdf = "00000000-0000-0000-0000-000000000083";
const pasta = fileURLToPath(new URL("../../base(tempval)/supabase/migrations/", import.meta.url));
let banco: PGlite;

async function preparar(publicacaoExistente: boolean) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text not null,
      raw_user_meta_data jsonb default '{}'::jsonb, encrypted_password text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  await completarInfraSupabase(db);
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
  for (const id of [autor, primeiro, segundo, terceiro, admin])
    await banco.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.invalid`]);
  await banco.query("update public.users set role = 'it_admin' where id = $1", [admin]);
  await banco.query("insert into public.release_groups (id, name, is_enabled) values ($1, 'Leituras teste', true)", [grupo]);
  await banco.query("insert into public.conversations (id) values ($1), ($2)", [conversa, alheia]);
}, 30000);

beforeEach(async () => {
  await banco.exec(`reset role; truncate public.messages cascade;
    delete from public.conversation_participants; delete from public.release_group_members;
    update public.users set status = 'active', must_change_password = false;`);
  await banco.query("update public.release_groups set is_enabled = true where id = $1", [grupo]);
  for (const id of [autor, primeiro, segundo, terceiro])
    await banco.query("insert into public.release_group_members (release_group_id, user_id) values ($1, $2)", [grupo, id]);
  for (const id of [autor, primeiro, segundo])
    await banco.query("insert into public.conversation_participants (conversation_id, user_id, joined_at) values ($1, $2, '2026-11-18')", [conversa, id]);
  await banco.query("insert into public.conversation_participants (conversation_id, user_id, joined_at) values ($1, $2, '2026-11-18')", [alheia, terceiro]);
  await banco.query(`insert into public.messages (id, conversation_id, sender_id, body, created_at)
    values ($1, $2, $3, 'Olá', '2026-11-19T00:00:00.123456Z')`, [mensagem, conversa, autor]);
  await banco.query(`insert into public.messages (id, conversation_id, sender_id, message_type, attachment_path, attachment_name, created_at)
    values ($1, $2, $3, 'pdf', '00000000-0000-0000-0000-000000000080/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000083.pdf', 'documento.pdf', '2026-11-19')`, [pdf, conversa, autor]);
});
afterAll(async () => { await banco?.close(); });

async function como<T>(id: string, operacao: () => Promise<T>): Promise<T> {
  await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await banco.exec("set role authenticated");
  try { return await operacao(); }
  finally { await banco.exec("reset role"); }
}
const registrar = (conversaId = conversa, mensagemId = mensagem) =>
  banco.query("select * from public.register_message_read($1, $2)", [conversaId, mensagemId]);
const consultar = (conversaId = conversa, ids = [mensagem]) =>
  banco.query<{ message_id: string; recipients: { user_id: string; read_at: string | null }[] }>(
    "select * from public.get_message_read_status($1, $2::uuid[])", [conversaId, ids]);
const inserirDireto = (userId = primeiro) => banco.query(
  "insert into public.message_reads (message_id, user_id) values ($1, $2)", [mensagem, userId]);

describe("migrations reais: leitura individual, idempotência, RLS e Realtime", () => {
  it("só marca o destinatário que visualizou; consultar não grava recibos", async () => {
    const antes = await como(autor, () => consultar());
    expect(antes.rows[0].recipients).toEqual([
      expect.objectContaining({ user_id: primeiro, read_at: null }),
      expect.objectContaining({ user_id: segundo, read_at: null }),
    ]);
    expect((await banco.query("select * from public.message_reads")).rows).toHaveLength(0);
    await como(primeiro, () => registrar());
    const depois = await como(autor, () => consultar());
    expect(depois.rows[0].recipients).toEqual([
      expect.objectContaining({ user_id: primeiro, read_at: expect.any(String) }),
      expect.objectContaining({ user_id: segundo, read_at: null }),
    ]);
    await como(segundo, () => registrar());
    expect((await banco.query("select * from public.message_reads")).rows).toHaveLength(2);
  });
  it("é idempotente e preserva o primeiro read_at", async () => {
    const primeira = await como(primeiro, () => registrar());
    // Força um horário anterior para detectar substituição em nova confirmação.
    await banco.query("update public.message_reads set read_at = '2026-11-19T00:01:00.123456Z' where user_id = $1", [primeiro]);
    const segunda = await como(primeiro, () => registrar());
    const terceira = await como(primeiro, () => registrar());
    expect(primeira.rows).toHaveLength(1);
    expect(terceira.rows).toEqual(segunda.rows);
    expect((await banco.query("select read_at::text as horario from public.message_reads")).rows)
      .toEqual([{ horario: "2026-11-19 00:01:00.123456+00" }]);
    expect((await banco.query("select * from public.message_reads")).rows).toHaveLength(1);
  });
  it("suporta mensagem PDF e consulta em lote sem expor o caminho privado", async () => {
    await como(primeiro, () => registrar(conversa, pdf));
    const resposta = await como(primeiro, () => consultar(conversa, [pdf, mensagem]));
    expect(resposta.rows.map((item) => item.message_id)).toEqual([pdf, mensagem]);
    expect(JSON.stringify(resposta.rows)).not.toContain("privado/");
    expect((await banco.query("select * from public.message_reads")).rows).toHaveLength(1);
  });
  it.each([terceiro, admin])("nega conversa alheia a terceiros e TI (%s)", async (id) => {
    await como(primeiro, () => registrar());
    await expect(como(id, () => registrar())).rejects.toMatchObject({ code: "42501" });
    await expect(como(id, () => consultar())).rejects.toMatchObject({ code: "42501" });
    await expect(como(id, () => inserirDireto(id))).rejects.toMatchObject({ code: "42501" });
    expect((await como(id, () => banco.query("select * from public.message_reads"))).rows).toEqual([]);
  });
  it("não deixa registrar por outro destinatário nem pelo próprio remetente", async () => {
    await expect(como(primeiro, () => inserirDireto(segundo))).rejects.toMatchObject({ code: "42501" });
    await expect(como(autor, () => inserirDireto(autor))).rejects.toMatchObject({ code: "42501" });
    await expect(como(autor, () => registrar())).rejects.toMatchObject({ code: "42501" });
  });
  it("nega IDs inexistentes, mensagem de outra conversa e mistura de IDs", async () => {
    await expect(como(primeiro, () => registrar(alheia))).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => registrar(conversa, alheia))).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => consultar(conversa, [mensagem, alheia]))).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["pending", "blocked", "disabled"])("nega leitura e escrita após status %s", async (status) => {
    await como(segundo, () => registrar());
    await banco.query("update public.users set status = $1::public.user_status where id = $2", [status, primeiro]);
    expect((await como(primeiro, () => banco.query("select * from public.message_reads"))).rows).toEqual([]);
    await expect(como(primeiro, () => registrar())).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => inserirDireto())).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => consultar())).rejects.toMatchObject({ code: "42501" });
  });
  it.each([primeiro, admin])("bloqueia must_change_password no banco também para TI (%s)", async (id) => {
    await banco.query(`insert into public.conversation_participants (conversation_id, user_id, joined_at)
      values ($1, $2, '2026-11-18') on conflict do nothing`, [conversa, id]);
    await como(segundo, () => registrar());
    await banco.query("update public.users set must_change_password = true where id = $1", [id]);
    expect((await como(id, () => banco.query("select * from public.message_reads"))).rows).toEqual([]);
    await expect(como(id, () => registrar())).rejects.toMatchObject({ code: "42501" });
    await expect(como(id, () => inserirDireto(id))).rejects.toMatchObject({ code: "42501" });
    await expect(como(id, () => consultar())).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["grupo-desabilitado", "sem-grupo", "participacao-removida"])("revoga todos os acessos após %s", async (tipo) => {
    await como(primeiro, () => registrar());
    if (tipo === "grupo-desabilitado") await banco.query("update public.release_groups set is_enabled = false where id = $1", [grupo]);
    if (tipo === "sem-grupo") await banco.query("delete from public.release_group_members where user_id = $1", [primeiro]);
    if (tipo === "participacao-removida") await banco.query("delete from public.conversation_participants where user_id = $1", [primeiro]);
    expect((await como(primeiro, () => banco.query("select * from public.message_reads"))).rows).toEqual([]);
    await expect(como(primeiro, () => registrar())).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => consultar())).rejects.toMatchObject({ code: "42501" });
  });
  it("registra exibição de histórico anterior à entrada se can_access_message permite", async () => {
    await banco.query("update public.conversation_participants set joined_at = '2026-11-20' where user_id = $1", [primeiro]);
    await como(primeiro, () => registrar());
    expect((await como(autor, () => consultar())).rows[0].recipients).toEqual([
      expect.objectContaining({ user_id: primeiro, read_at: expect.any(String) }),
      expect.objectContaining({ user_id: segundo, read_at: null }),
    ]);
  });
  it("permite leitura da TI participante com senha já substituída", async () => {
    await banco.query("insert into public.conversation_participants (conversation_id, user_id, joined_at) values ($1, $2, '2026-11-18')", [conversa, admin]);
    expect((await como(admin, () => registrar())).rows).toHaveLength(1);
  });
  it("não permite forjar horário nem alterar ou apagar um recibo", async () => {
    await expect(como(primeiro, () => banco.query(`insert into public.message_reads (message_id, user_id, read_at)
      values ($1, $2, '2099-01-01')`, [mensagem, primeiro]))).rejects.toMatchObject({ code: "42501" });
    await como(primeiro, () => registrar());
    await expect(como(primeiro, () => banco.query("update public.message_reads set read_at = '2099-01-01'"))).rejects.toMatchObject({ code: "42501" });
    await expect(como(primeiro, () => banco.query("delete from public.message_reads"))).rejects.toMatchObject({ code: "42501" });
    expect((await banco.query("select * from public.message_reads")).rows).toHaveLength(1);
  });
  it("nega RPCs e escrita anônimas, sem expor recibos", async () => {
    await como(primeiro, () => registrar());
    await banco.exec("set role anon");
    try {
      await expect(registrar()).rejects.toMatchObject({ code: "42501" });
      await expect(consultar()).rejects.toMatchObject({ code: "42501" });
      await expect(inserirDireto()).rejects.toMatchObject({ code: "42501" });
      expect((await banco.query("select * from public.message_reads")).rows).toEqual([]);
    } finally { await banco.exec("reset role"); }
  });
  it.each([[], [mensagem, mensagem], [null], Array.from({ length: 51 }, () => mensagem)].map((ids) => ({ ids })))("limita o lote também na RPC (%#)", async ({ ids }) => {
    await expect(como(primeiro, () => banco.query("select * from public.get_message_read_status($1, $2::uuid[])", [conversa, ids])))
      .rejects.toMatchObject({ code: "22023" });
  });
  it("publica message_reads sem remover as tabelas existentes da publicação", async () => {
    const { rows } = await banco.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'");
    expect(rows).toEqual(expect.arrayContaining([{ tablename: "message_reads" }, { tablename: "realtime_sentinel" }]));
    expect((await banco.query("select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'message_reads'")).rows).toHaveLength(1);
  });
  it("cria a publicação quando necessário", async () => {
    const db = await preparar(false);
    try {
      const { rows } = await db.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime'");
      expect(rows).toContainEqual({ tablename: "message_reads" });
    } finally { await db.close(); }
  }, 30000);
});
