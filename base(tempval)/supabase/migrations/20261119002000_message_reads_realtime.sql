-- Recibos imutáveis: somente o destinatário autenticado pode registrar sua leitura.
-- Mantém as policies SELECT existentes, baseadas em can_access_message().
revoke insert, update, delete on public.message_reads from public, anon, authenticated;
revoke insert (message_id, user_id, read_at), update (message_id, user_id, read_at)
  on public.message_reads from public, anon, authenticated;
grant select on public.message_reads to authenticated;
grant insert (message_id, user_id) on public.message_reads to authenticated;

create policy "message_reads_insert_own_authorized_recipient"
  on public.message_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_message(message_id)
    and exists (
      select 1 from public.messages message
      join public.conversation_participants recipient
        on recipient.conversation_id = message.conversation_id
      where message.id = message_reads.message_id
        and message.sender_id <> (select auth.uid())
        and recipient.user_id = (select auth.uid())
    )
  );

create function public.register_message_read(p_conversation_id uuid, p_message_id uuid)
returns table (message_id uuid, user_id uuid, read_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.can_access_message(p_message_id) or not exists (
    select 1 from public.messages message
    join public.conversation_participants recipient
      on recipient.conversation_id = message.conversation_id
    where message.id = p_message_id
      and message.conversation_id = p_conversation_id
      and message.sender_id <> (select auth.uid())
      and recipient.user_id = (select auth.uid())
  ) then
    raise exception 'Acesso não autorizado à mensagem.' using errcode = '42501';
  end if;

  insert into public.message_reads (message_id, user_id)
  values (p_message_id, (select auth.uid()))
  on conflict on constraint message_reads_pkey do nothing;

  return query select receipt.message_id, receipt.user_id, receipt.read_at
    from public.message_reads receipt
    where receipt.message_id = p_message_id and receipt.user_id = (select auth.uid());
end;
$$;

-- Consulta em lote limitada a 50 mensagens, sem marcar nada como lido.
-- SECURITY INVOKER mantém RLS em mensagens, participantes e recibos.
create function public.get_message_read_status(p_conversation_id uuid, p_message_ids uuid[])
returns table (message_id uuid, conversation_id uuid, sender_id uuid, recipients jsonb)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_message_ids is null or cardinality(p_message_ids) not between 1 and 50
    or array_position(p_message_ids, null) is not null
    or (select count(distinct id) from unnest(p_message_ids) id) <> cardinality(p_message_ids)
  then
    raise exception 'Lista de mensagens inválida.' using errcode = '22023';
  end if;
  if not public.can_access_conversation(p_conversation_id) or not exists (
    select 1 from public.conversation_participants participant
    where participant.conversation_id = p_conversation_id
      and participant.user_id = (select auth.uid())
  ) or (
    select count(*) from public.messages message
    where message.conversation_id = p_conversation_id and message.id = any(p_message_ids)
      and public.can_access_message(message.id)
  ) <> cardinality(p_message_ids) then
    raise exception 'Acesso não autorizado às mensagens.' using errcode = '42501';
  end if;

  return query
    select message.id, message.conversation_id, message.sender_id,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', recipient.user_id, 'joined_at', recipient.joined_at, 'read_at', receipt.read_at
        ) order by recipient.user_id)
        from public.conversation_participants recipient
        left join public.message_reads receipt
          on receipt.message_id = message.id and receipt.user_id = recipient.user_id
        where recipient.conversation_id = message.conversation_id
          and recipient.user_id <> message.sender_id
      ), '[]'::jsonb)
    from public.messages message
    where message.conversation_id = p_conversation_id and message.id = any(p_message_ids)
      and public.can_access_message(message.id)
    order by array_position(p_message_ids, message.id);
end;
$$;

revoke all on function public.register_message_read(uuid, uuid) from public, anon;
revoke all on function public.get_message_read_status(uuid, uuid[]) from public, anon;
grant execute on function public.register_message_read(uuid, uuid) to authenticated;
grant execute on function public.get_message_read_status(uuid, uuid[]) to authenticated;

-- Preserva a publicação e suas demais tabelas, inclusive a migration do PR #101.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end;
$$;
