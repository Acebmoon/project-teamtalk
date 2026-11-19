import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CONVERSA, OBJETO, USUARIO } from "./fixtures";

const destinatario = "55555555-5555-4555-8555-555555555555";
const terceiro = "66666666-6666-4666-8666-666666666666";
const admin = "77777777-7777-4777-8777-777777777777";
const grupo = "88888888-8888-4888-8888-888888888888";
const outraConversa = "99999999-9999-4999-8999-999999999999";
const caminho = `${CONVERSA}/${USUARIO}/${OBJETO}.pdf`;
const migrations = fileURLToPath(new URL("../../base(tempval)/supabase/migrations/", import.meta.url));
let banco: PGlite;

beforeAll(async () => {
  banco = new PGlite();
  // Schemas/plataforma que o Supabase já fornece. As regras de aplicação abaixo
  // são carregadas das migrations reais, sem réplicas de policies em mocks.
  await banco.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (
      id uuid primary key, email text not null, raw_user_meta_data jsonb default '{}', encrypted_password text
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table storage.buckets (
      id text primary key, name text not null, public boolean default false, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
      name text not null, metadata jsonb, unique(bucket_id, name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant all on storage.objects to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    -- Uma policy permissiva genérica não pode reabrir o bucket de PDFs.
    create policy generic_storage_policy on storage.objects for all to anon, authenticated
    using (true) with check (true);
  `);
  for (const nome of (await readdir(migrations)).filter((nome) => nome.endsWith(".sql")).sort()) {
    await banco.exec(await readFile(`${migrations}/${nome}`, "utf8"));
  }
  for (const id of [USUARIO, destinatario, terceiro, admin]) {
    await banco.query("insert into auth.users(id, email) values ($1, $2)", [id, `${id}@test.invalid`]);
  }
  await banco.query("update public.users set role = 'it_admin' where id = $1", [admin]);
  await banco.query("insert into public.release_groups(id, name, is_enabled) values ($1, 'PDF teste', true)", [grupo]);
  await banco.query("insert into public.conversations(id) values ($1), ($2)", [CONVERSA, outraConversa]);
  await banco.exec("insert into storage.buckets(id, name) values ('outro', 'outro')");
}, 30000);

beforeEach(async () => {
  await banco.exec(`reset role; truncate public.messages cascade; truncate storage.objects;
    update public.users set status = 'active', must_change_password = false;
    update public.release_groups set is_enabled = true;
    delete from public.conversation_participants;
  `);
  for (const id of [USUARIO, destinatario, terceiro]) {
    await banco.query("insert into public.release_group_members(release_group_id, user_id) values ($1, $2) on conflict do nothing", [grupo, id]);
  }
  for (const id of [USUARIO, destinatario]) {
    await banco.query("insert into public.conversation_participants(conversation_id, user_id) values ($1, $2)", [CONVERSA, id]);
  }
  await banco.query("insert into storage.objects(bucket_id, name, metadata) values ('chat-pdfs', $1, '{\"mimetype\":\"application/pdf\"}')", [caminho]);
});

afterAll(async () => { await banco?.close(); });

async function como<T>(id: string, acao: () => Promise<T>, papel = "authenticated") {
  await banco.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await banco.exec(`set role ${papel === "anon" ? "anon" : "authenticated"}`);
  try { return await acao(); }
  finally { await banco.exec("reset role"); }
}

function inserir(remetente = USUARIO, conversa = CONVERSA, objeto = caminho, nome = "documento.pdf") {
  return banco.query(`insert into public.messages
    (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
    values ($1, $2, 'pdf', null, $3, $4) returning *`, [conversa, remetente, objeto, nome]);
}

describe("migrations reais: Storage privado e RLS de anexos", () => {
  it("cria bucket privado exclusivo de application/pdf", async () => {
    expect((await banco.query("select public, allowed_mime_types from storage.buckets where id = 'chat-pdfs'")).rows)
      .toEqual([{ public: false, allowed_mime_types: ["application/pdf"] }]);
  });

  it("persiste PDF com objeto validado e permite leitura só a participantes", async () => {
    const enviada = await como(USUARIO, () => inserir());
    expect(enviada.rows[0]).toMatchObject({ message_type: "pdf", body: null, attachment_path: caminho, attachment_name: "documento.pdf" });
    expect((await como(destinatario, () => banco.query("select * from public.messages"))).rows).toEqual(enviada.rows);
    for (const id of [terceiro, admin]) {
      expect((await como(id, () => banco.query("select * from public.messages"))).rows).toEqual([]);
      await expect(como(id, () => inserir(id))).rejects.toMatchObject({ code: "42501" });
    }
  });

  it("nega remetente forjado, conversa alheia, objeto inexistente e objeto de outro remetente", async () => {
    await expect(como(USUARIO, () => inserir(destinatario))).rejects.toMatchObject({ code: "42501" });
    await expect(como(USUARIO, () => inserir(USUARIO, outraConversa))).rejects.toMatchObject({ code: "42501" });
    await expect(como(destinatario, () => inserir(destinatario))).rejects.toMatchObject({ code: "42501" });
    await banco.exec("delete from storage.objects");
    await expect(como(USUARIO, () => inserir())).rejects.toMatchObject({ code: "42501" });
  });

  it("não aceita mensagem para objeto com MIME incorreto", async () => {
    await banco.exec("update storage.objects set metadata = '{\"mimetype\":\"image/png\"}'");
    await expect(como(USUARIO, () => inserir())).rejects.toMatchObject({ code: "42501" });
  });

  it.each([USUARIO, terceiro, ""])("bloqueia acesso direto ao bucket e bypass de validação (%s)", async (id) => {
    const papel = id ? "authenticated" : "anon";
    expect((await como(id, () => banco.query("select * from storage.objects where bucket_id = 'chat-pdfs'"), papel)).rows).toEqual([]);
    await expect(como(id, () => banco.query("insert into storage.objects(bucket_id, name) values ('chat-pdfs', 'falso.pdf')"), papel))
      .rejects.toMatchObject({ code: "42501" });
    expect((await como(id, () => banco.query("update storage.objects set metadata = '{}' where bucket_id = 'chat-pdfs' returning id"), papel)).rows).toEqual([]);
    expect((await como(id, () => banco.query("delete from storage.objects where bucket_id = 'chat-pdfs' returning id"), papel)).rows).toEqual([]);
  });

  it("preserva as regras de outros buckets", async () => {
    await como(USUARIO, () => banco.exec("insert into storage.objects(bucket_id, name) values ('outro', 'livre')"));
    expect((await como(USUARIO, () => banco.query("select name from storage.objects"))).rows).toEqual([{ name: "livre" }]);
  });

  it.each(["pending", "blocked", "disabled", "senha-provisoria", "sem-grupo", "grupo-desabilitado", "removido"])(
    "revoga leitura e escrita com %s", async (caso) => {
      await como(USUARIO, () => inserir());
      if (["pending", "blocked", "disabled"].includes(caso)) {
        await banco.query("update public.users set status = $1::public.user_status where id = $2", [caso, USUARIO]);
      } else if (caso === "senha-provisoria") {
        await banco.query("update public.users set must_change_password = true where id = $1", [USUARIO]);
      } else if (caso === "sem-grupo") {
        await banco.query("delete from public.release_group_members where user_id = $1", [USUARIO]);
      } else if (caso === "grupo-desabilitado") {
        await banco.query("update public.release_groups set is_enabled = false where id = $1", [grupo]);
      } else {
        await banco.query("delete from public.conversation_participants where user_id = $1", [USUARIO]);
      }
      expect((await como(USUARIO, () => banco.query("select * from public.messages"))).rows).toEqual([]);
      await expect(como(USUARIO, () => inserir())).rejects.toMatchObject({ code: "42501" });
    },
  );

  it("nega anônimo inclusive na função que verifica o objeto", async () => {
    await expect(como("", () => inserir(), "anon")).rejects.toMatchObject({ code: "42501" });
    await expect(como("", () => banco.query("select public.is_valid_pdf_attachment($1, $2)", [CONVERSA, caminho]), "anon"))
      .rejects.toMatchObject({ code: "42501" });
  });

  it("impede reuso do caminho, timestamps forjados e nomes inválidos", async () => {
    await expect(como(USUARIO, () => inserir(USUARIO, CONVERSA, caminho, "arquivo.docx"))).rejects.toMatchObject({ code: "23514" });
    await como(USUARIO, () => inserir());
    await expect(como(USUARIO, () => inserir())).rejects.toMatchObject({ code: "23505" });
    await expect(como(USUARIO, () => banco.query(`insert into public.messages
      (conversation_id, sender_id, message_type, body, attachment_path, attachment_name, created_at)
      values ($1, $2, 'pdf', null, $3, 'arquivo.pdf', '2099-01-01')`, [CONVERSA, USUARIO, caminho])))
      .rejects.toMatchObject({ code: "42501" });
  });
});
