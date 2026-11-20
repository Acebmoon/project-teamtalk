import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const id = (numero: number) => `00000000-0000-0000-0000-${String(numero).padStart(12, "0")}`;
const alice = id(1), bob = id(2), carol = id(3), admin = id(4);
const conversa = id(98), alheia = id(99), nova = id(100), grupo = id(10);
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Infra Auth/grants fornecida pelo Supabase em produção. As políticas e
  // funções de autorização são as migrations reais, executadas integralmente.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, encrypted_password text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    alter default privileges in schema public grant select on tables to authenticated, anon;
  `);
  const diretorio = fileURLToPath(new URL("../../base(tempval)/supabase/migrations/", import.meta.url));
  for (const arquivo of (await readdir(diretorio)).filter((nome) => nome.endsWith(".sql")).sort())
    await db.exec(await readFile(`${diretorio}/${arquivo}`, "utf8"));
}, 30_000);
afterAll(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec("reset role; truncate auth.users, public.release_groups restart identity cascade;");
  for (const [usuario, nome] of [[alice, "Alice"], [bob, "Bob"], [carol, "Carol"], [admin, "Admin"]])
    await db.query("insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)", [usuario, `${nome}@test.invalid`, { display_name: nome }]);
  await db.exec(`
    update public.users set status = 'active', must_change_password = false;
    update public.users set role = 'it_admin' where id = '${admin}';
    insert into public.release_groups(id, name, is_enabled) values ('${grupo}', 'Teste', true);
    insert into public.release_group_members(release_group_id, user_id) values
      ('${grupo}', '${alice}'), ('${grupo}', '${bob}'), ('${grupo}', '${carol}');
    insert into public.conversations(id, title) values ('${conversa}', 'Compartilhada'), ('${alheia}', 'Privada'), ('${nova}', 'Nova');
    insert into public.conversation_participants(conversation_id, user_id) values
      ('${conversa}', '${alice}'), ('${conversa}', '${bob}'), ('${alheia}', '${bob}'),
      ('${alheia}', '${carol}'), ('${nova}', '${alice}');
  `);
});

async function como<T>(usuario: string | null, operacao: () => Promise<T>, papel = "authenticated") {
  await db.exec(`set role ${papel}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario ?? ""]);
  try { return await operacao(); } finally { await db.exec("reset role"); }
}
async function inserir(dono = alice, chat = conversa, prioridade = "alta") {
  return db.query(`insert into public.inbox_preferences(user_id, conversation_id, priority, situation, is_favorite)
    values ($1, $2, $3, 'acompanhar', true) returning *`, [dono, chat, prioridade]);
}
async function ler() { return (await db.query("select * from public.inbox_preferences order by conversation_id")).rows; }

describe("PostgreSQL: migrations e RLS reais da Inbox", () => {
  it("permite CRUD próprio, mantém chave única e persiste em nova consulta da sessão", async () => {
    await como(alice, () => inserir());
    const salvas = await como(alice, ler);
    expect(salvas).toMatchObject([{ user_id: alice, conversation_id: conversa, priority: "alta", is_favorite: true }]);
    await como(alice, () => db.query("update public.inbox_preferences set priority = 'urgente', situation = 'concluida' returning *"));
    expect(await como(alice, ler)).toMatchObject([{ priority: "urgente", situation: "concluida" }]);
    await expect(como(alice, () => inserir())).rejects.toMatchObject({ code: "23505" });
    await como(alice, () => db.query("delete from public.inbox_preferences"));
    expect(await como(alice, ler)).toEqual([]);
  });
  it("isola dois usuários da mesma conversa, inclusive UPDATE e DELETE diretos", async () => {
    await como(alice, () => inserir());
    await como(bob, () => inserir(bob, conversa, "normal"));
    expect(await como(alice, ler)).toHaveLength(1);
    expect(await como(bob, ler)).toMatchObject([{ user_id: bob, priority: "normal" }]);
    expect((await como(bob, () => db.query("update public.inbox_preferences set priority = 'urgente' where user_id = $1 returning *", [alice]))).rows).toEqual([]);
    expect((await como(bob, () => db.query("delete from public.inbox_preferences where user_id = $1 returning *", [alice]))).rows).toEqual([]);
    expect(await como(alice, ler)).toMatchObject([{ priority: "alta" }]);
  });
  it("recusa INSERT e upsert em nome de outro usuário participante", async () => {
    await como(alice, () => inserir());
    await expect(como(bob, () => inserir(alice, nova))).rejects.toMatchObject({ code: "42501" });
    await expect(como(bob, () => db.query(`insert into public.inbox_preferences(user_id, conversation_id, priority)
      values ($1, $2, 'urgente') on conflict (user_id, conversation_id) do update set priority = excluded.priority`, [alice, conversa])))
      .rejects.toMatchObject({ code: "42501" });
  });
  it("WITH CHECK impede trocar o dono ou mover a linha para conversa alheia", async () => {
    await como(alice, () => inserir());
    await expect(como(alice, () => db.query("update public.inbox_preferences set user_id = $1", [bob]))).rejects.toMatchObject({ code: "42501" });
    await expect(como(alice, () => db.query("update public.inbox_preferences set conversation_id = $1", [alheia]))).rejects.toMatchObject({ code: "42501" });
  });
  it("nega conversa alheia e inexistente com o mesmo erro de RLS", async () => {
    await como(bob, () => inserir(bob, alheia));
    expect(await como(alice, ler)).toEqual([]);
    for (const chat of [alheia, id(999)])
      await expect(como(alice, () => inserir(alice, chat))).rejects.toMatchObject({ code: "42501" });
  });
  it("must_change_password bloqueia leitura, inserção, alteração e exclusão", async () => {
    await como(alice, () => inserir());
    await db.query("update public.users set must_change_password = true where id = $1", [alice]);
    expect(await como(alice, ler)).toEqual([]);
    await expect(como(alice, () => inserir(alice, nova))).rejects.toMatchObject({ code: "42501" });
    expect((await como(alice, () => db.query("update public.inbox_preferences set priority = 'urgente' returning *"))).rows).toEqual([]);
    expect((await como(alice, () => db.query("delete from public.inbox_preferences returning *"))).rows).toEqual([]);
    expect(await ler()).toHaveLength(1);
  });
  it.each(["pending", "blocked", "disabled"])("revoga leitura e escrita para conta %s", async (status) => {
    await como(alice, () => inserir());
    await db.query("update public.users set status = $1 where id = $2", [status, alice]);
    expect(await como(alice, ler)).toEqual([]);
    await expect(como(alice, () => inserir(alice, nova))).rejects.toMatchObject({ code: "42501" });
  });
  it.each(["grupo-desabilitado", "remocao-grupo"])("revoga preferências após %s", async (cenario) => {
    await como(alice, () => inserir());
    if (cenario === "grupo-desabilitado") await db.query("update public.release_groups set is_enabled = false where id = $1", [grupo]);
    else await db.query("delete from public.release_group_members where user_id = $1", [alice]);
    expect(await como(alice, ler)).toEqual([]);
    await expect(como(alice, () => inserir(alice, nova))).rejects.toMatchObject({ code: "42501" });
  });
  it("exige que Admin TI seja dono e participante", async () => {
    await como(alice, () => inserir());
    expect(await como(admin, ler)).toEqual([]);
    await expect(como(admin, () => inserir(admin))).rejects.toMatchObject({ code: "42501" });
    await db.query("insert into public.conversation_participants(conversation_id, user_id) values ($1, $2)", [conversa, admin]);
    await como(admin, () => inserir(admin));
    expect(await como(admin, ler)).toMatchObject([{ user_id: admin }]);
  });
  it("remove metadados ao sair da conversa, sem ressuscitá-los na reentrada", async () => {
    await como(alice, () => inserir());
    await como(bob, () => inserir(bob));
    await db.query("delete from public.conversation_participants where conversation_id = $1 and user_id = $2", [conversa, alice]);
    expect(await como(alice, ler)).toEqual([]);
    expect(await ler()).toMatchObject([{ user_id: bob }]);
    await db.query("insert into public.conversation_participants(conversation_id, user_id) values ($1, $2)", [conversa, alice]);
    expect(await como(alice, ler)).toEqual([]);
  });
  it("revoga anon e não concede dados a authenticated sem auth.uid", async () => {
    await como(alice, () => inserir());
    await expect(como(null, ler, "anon")).rejects.toMatchObject({ code: "42501" });
    await expect(como(null, () => inserir(), "anon")).rejects.toMatchObject({ code: "42501" });
    expect(await como(null, ler)).toEqual([]);
    await expect(como(null, () => inserir())).rejects.toMatchObject({ code: "42501" });
  });
  it("aplica valores padrão e constraints mesmo fora da API", async () => {
    await como(alice, () => db.query("insert into public.inbox_preferences(user_id, conversation_id) values ($1, $2)", [alice, conversa]));
    expect(await como(alice, ler)).toMatchObject([{ priority: "normal", situation: "em-conversa", is_favorite: false }]);
    await expect(como(alice, () => db.query("update public.inbox_preferences set priority = 'critica'"))).rejects.toMatchObject({ code: "23514" });
    await expect(como(alice, () => db.query("update public.inbox_preferences set situation = 'done'"))).rejects.toMatchObject({ code: "23514" });
  });
  it("não grava parte de um lote recusado e não altera a conversa compartilhada", async () => {
    const antes = (await db.query("select * from public.conversations order by id")).rows;
    await expect(como(alice, () => db.query(`insert into public.inbox_preferences(user_id, conversation_id)
      values ($1, $2), ($1, $3)`, [alice, conversa, alheia]))).rejects.toMatchObject({ code: "42501" });
    expect(await ler()).toEqual([]);
    await como(alice, () => inserir());
    expect((await db.query("select * from public.conversations order by id")).rows).toEqual(antes);
    expect((await db.query("select * from public.messages")).rows).toEqual([]);
  });
  it("cascateia a exclusão da conversa", async () => {
    await como(alice, () => inserir());
    await db.query("delete from public.conversations where id = $1", [conversa]);
    expect(await ler()).toEqual([]);
  });
});
