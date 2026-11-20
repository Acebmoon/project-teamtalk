import type { PGlite } from "@electric-sql/pglite";

/** Infraestrutura instalada pelo Supabase, antes das migrations da aplicação. */
export async function completarInfraSupabase(banco: PGlite) {
  await banco.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role bypassrls;
      end if;
    end $$;
    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key, name text not null, public boolean default false,
      allowed_mime_types text[], file_size_limit bigint
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
      name text not null, metadata jsonb, unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage, public, auth to anon, authenticated, service_role;
    grant all on all tables in schema storage to service_role;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
}
