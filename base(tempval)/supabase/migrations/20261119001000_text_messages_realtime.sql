-- Refs #79. Escrita com o JWT do usuário; sem service_role ou alteração das migrations anteriores.
-- NOT VALID preserva eventual conteúdo legado e verifica todas as novas escritas.
alter table public.messages add constraint messages_text_body_valid check (
  message_type <> 'text'::public.message_type
  or (char_length(body) between 1 and 4000 and body ~ '[^[:space:]]')
) not valid;

create index messages_conversation_created_id_idx
on public.messages (conversation_id, created_at desc, id desc);

create policy "messages_insert_authorized_sender_text"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and message_type = 'text'::public.message_type
  and public.can_access_conversation(conversation_id)
);

-- Apenas colunas necessárias ao envio. id, timestamps e edited_at vêm do banco.
revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
on public.messages to authenticated;

-- Funciona tanto no Supabase (publicação já criada) quanto no banco local.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
