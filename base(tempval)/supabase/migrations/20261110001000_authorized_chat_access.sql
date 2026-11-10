-- Enforce the gradual-release gate for all chat data. Being authenticated is not
-- sufficient: an employee must be active and belong to an enabled release group.
-- IT admins can manage release groups but do not get implicit access to private chats.

create function public.is_active_authorized_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'::public.user_status
      and (
        u.role = 'it_admin'::public.user_role
        or exists (
          select 1
          from public.release_group_members membership
          join public.release_groups release_group
            on release_group.id = membership.release_group_id
          where membership.user_id = u.id
            and release_group.is_enabled
        )
      )
  );
$$;

create function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_authorized_user()
    and exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = p_conversation_id
        and participant.user_id = (select auth.uid())
    );
$$;

create function public.can_access_message(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.messages message
    where message.id = p_message_id
      and public.can_access_conversation(message.conversation_id)
  );
$$;

revoke all on function public.is_active_authorized_user() from public;
revoke all on function public.can_access_conversation(uuid) from public;
revoke all on function public.can_access_message(uuid) from public;
grant execute on function public.is_active_authorized_user() to authenticated;
grant execute on function public.can_access_conversation(uuid) to authenticated;
grant execute on function public.can_access_message(uuid) to authenticated;

-- Keep an initial release group ready for the staged rollout, but disabled until
-- the company explicitly authorizes access.
insert into public.release_groups (name, description, is_enabled)
values (
  'Diretoria / nível estratégico',
  'Grupo inicial previsto para a implantação gradual do TeamTalk.',
  false
)
on conflict (name) do nothing;

-- Replace the permissive participant/admin read rules. Chat content remains
-- private even from IT admins unless they are actual conversation participants.
drop policy if exists "conversation_participants_select_self_or_admin"
  on public.conversation_participants;
create policy "conversation_participants_select_authorized_conversation"
  on public.conversation_participants
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists "conversations_select_participant_or_admin"
  on public.conversations;
create policy "conversations_select_authorized_participant"
  on public.conversations
  for select to authenticated
  using (public.can_access_conversation(id));

drop policy if exists "messages_select_participant_or_admin"
  on public.messages;
create policy "messages_select_authorized_participant"
  on public.messages
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists "message_reads_select_participant_or_admin"
  on public.message_reads;
create policy "message_reads_select_authorized_participant"
  on public.message_reads
  for select to authenticated
  using (public.can_access_message(message_id));

-- A status change, removal from all enabled groups, or group disablement
-- immediately revokes access to existing conversation data on the next query.
