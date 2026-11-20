-- Refs #78. A função executa com as permissões/RLS do usuário autenticado.
create function public.list_authorized_conversations(
  p_limit integer default 20,
  p_before_activity_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  type public.conversation_type,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  activity_at timestamptz,
  participants jsonb,
  last_message jsonb,
  unread_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception using errcode = '22023', message = 'p_limit deve estar entre 1 e 50';
  end if;
  if (p_before_activity_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'Cursor incompleto';
  end if;

  return query
  with candidates as (
    select c.id, c.type, c.title, c.created_at, c.updated_at,
      greatest(c.updated_at, coalesce(latest.created_at, c.created_at)) as activity_at,
      membership.joined_at,
      case when latest.id is null then null else jsonb_build_object(
        'id', latest.id,
        'sender_id', latest.sender_id,
        'message_type', latest.message_type,
        'body', latest.body,
        'attachment_name', latest.attachment_name,
        'created_at', latest.created_at
      ) end as last_message
    from public.conversations c
    join public.conversation_participants membership
      on membership.conversation_id = c.id
      and membership.user_id = (select auth.uid())
    left join lateral (
      select m.id, m.sender_id, m.message_type, m.body, m.attachment_name, m.created_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc, m.id desc
      limit 1
    ) latest on true
    where public.can_access_conversation(c.id)
  ), page as materialized (
    select candidate.* from candidates candidate
    where p_before_activity_at is null
      or (candidate.activity_at, candidate.id) < (p_before_activity_at, p_before_id)
    order by candidate.activity_at desc, candidate.id desc
    -- A linha adicional permite detectar a próxima página sem contar tudo.
    limit p_limit + 1
  )
  select page.id, page.type, page.title, page.created_at, page.updated_at,
    page.activity_at,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', participant.user_id,
        'joined_at', participant.joined_at
      ) order by participant.user_id), '[]'::jsonb)
      from public.conversation_participants participant
      where participant.conversation_id = page.id
    ),
    page.last_message,
    (
      select count(*) from public.messages unread
      where unread.conversation_id = page.id
        and unread.sender_id <> (select auth.uid())
        and unread.created_at >= page.joined_at
        and not exists (
          select 1 from public.message_reads receipt
          where receipt.message_id = unread.id
            and receipt.user_id = (select auth.uid())
        )
    )
  from page
  order by page.activity_at desc, page.id desc;
end;
$$;

revoke all on function public.list_authorized_conversations(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_authorized_conversations(integer, timestamptz, uuid) to authenticated;
