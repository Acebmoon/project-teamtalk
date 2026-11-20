-- Refs #98: organização privada; não altera mensagens nem a conversa compartilhada.
create table public.inbox_preferences (
  user_id uuid not null references public.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  priority text not null default 'normal' check (priority in ('normal', 'alta', 'urgente')),
  situation text not null default 'em-conversa' check (situation in ('acompanhar', 'em-conversa', 'concluida')),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_id),
  -- A saída da conversa apaga as preferências, inclusive antes de uma reentrada.
  foreign key (conversation_id, user_id)
    references public.conversation_participants (conversation_id, user_id) on delete cascade
);

create index inbox_preferences_conversation_id_idx on public.inbox_preferences (conversation_id);
create trigger inbox_preferences_set_updated_at before update on public.inbox_preferences
for each row execute function public.set_updated_at();

alter table public.inbox_preferences enable row level security;
alter table public.inbox_preferences force row level security;

-- can_access_conversation exige conta ativa/liberada, participação e
-- must_change_password = false (migration 20261111000000).
-- Admin TI também precisa ser dono e participante; não há exceção administrativa.
create policy inbox_preferences_select_owner on public.inbox_preferences
for select to authenticated
using (user_id = (select auth.uid()) and public.can_access_conversation(conversation_id));

create policy inbox_preferences_insert_owner on public.inbox_preferences
for insert to authenticated
with check (user_id = (select auth.uid()) and public.can_access_conversation(conversation_id));

create policy inbox_preferences_update_owner on public.inbox_preferences
for update to authenticated
using (user_id = (select auth.uid()) and public.can_access_conversation(conversation_id))
with check (user_id = (select auth.uid()) and public.can_access_conversation(conversation_id));

create policy inbox_preferences_delete_owner on public.inbox_preferences
for delete to authenticated
using (user_id = (select auth.uid()) and public.can_access_conversation(conversation_id));

revoke all on public.inbox_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.inbox_preferences to authenticated;
