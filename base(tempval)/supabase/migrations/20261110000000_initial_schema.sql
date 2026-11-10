-- TeamTalk MVP foundation. Authentication credentials remain in Supabase Auth.
create type public.user_role as enum ('employee', 'it_admin');
create type public.user_status as enum ('pending', 'active', 'blocked', 'disabled');
create type public.conversation_type as enum ('direct', 'group');
create type public.message_type as enum ('text', 'pdf');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.user_role not null default 'employee',
  status public.user_status not null default 'pending',
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_display_name_nonempty check (length(btrim(display_name)) > 0)
);

create table public.release_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint release_groups_name_nonempty check (length(btrim(name)) > 0)
);

create table public.release_group_members (
  release_group_id uuid not null references public.release_groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references public.users (id) on delete set null,
  primary key (release_group_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  title text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_group_title check (type <> 'group' or title is not null)
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  added_by uuid references public.users (id) on delete set null,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete restrict,
  message_type public.message_type not null default 'text',
  body text,
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint messages_payload_matches_type check (
    (message_type = 'text' and body is not null and length(btrim(body)) > 0 and attachment_path is null and attachment_name is null)
    or
    (message_type = 'pdf' and body is null and attachment_path is not null and attachment_name is not null)
  )
);

create table public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users (id) on delete set null,
  action text not null,
  target_user_id uuid references public.users (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_nonempty check (length(btrim(action)) > 0)
);

create index release_group_members_user_id_idx on public.release_group_members (user_id);
create index conversation_participants_user_id_idx on public.conversation_participants (user_id);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_idx on public.messages (sender_id);
create index message_reads_user_id_idx on public.message_reads (user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_target_user_id_idx on public.audit_logs (target_user_id);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();
create trigger release_groups_set_updated_at before update on public.release_groups
for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create function public.is_active_it_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid())
      and role = 'it_admin'::public.user_role
      and status = 'active'::public.user_status
  );
$$;

alter table public.users enable row level security;
alter table public.release_groups enable row level security;
alter table public.release_group_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.audit_logs enable row level security;

create policy "users_select_self_or_admin" on public.users for select to authenticated
using (id = (select auth.uid()) or (select public.is_active_it_admin()));

create policy "release_groups_select_active_members" on public.release_groups for select to authenticated
using (
  (is_enabled and exists (
    select 1 from public.release_group_members membership
    join public.users member on member.id = membership.user_id
    where membership.release_group_id = release_groups.id
      and membership.user_id = (select auth.uid())
      and member.status = 'active'::public.user_status
  )) or (select public.is_active_it_admin())
);

create policy "release_group_members_select_self_or_admin" on public.release_group_members for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_active_it_admin()));

create policy "conversation_participants_select_self_or_admin" on public.conversation_participants for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_active_it_admin()));

create policy "conversations_select_participant_or_admin" on public.conversations for select to authenticated
using (
  exists (
    select 1 from public.conversation_participants participant
    where participant.conversation_id = conversations.id
      and participant.user_id = (select auth.uid())
  ) or (select public.is_active_it_admin())
);

create policy "messages_select_participant_or_admin" on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversation_participants participant
    where participant.conversation_id = messages.conversation_id
      and participant.user_id = (select auth.uid())
  ) or (select public.is_active_it_admin())
);

create policy "message_reads_select_participant_or_admin" on public.message_reads for select to authenticated
using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.messages message
    join public.conversation_participants participant on participant.conversation_id = message.conversation_id
    where message.id = message_reads.message_id
      and participant.user_id = (select auth.uid())
  ) or (select public.is_active_it_admin())
);

create policy "audit_logs_select_admin_only" on public.audit_logs for select to authenticated
using ((select public.is_active_it_admin()));

-- Writes are intentionally unavailable to client roles in this foundation.
-- Later server-side features must authorize writes and use narrowly scoped policies.
