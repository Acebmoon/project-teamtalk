-- Refs #84. Migration aditiva: validação dos bytes no servidor, Storage privado,
-- mensagens gravadas com JWT do participante e RLS reavaliada na persistência.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('chat-pdfs', 'chat-pdfs', false, array['application/pdf'])
on conflict (id) do update
set public = false, allowed_mime_types = array['application/pdf'];

-- Nenhum cliente pode contornar o parser via Storage, nem gerar URLs por conta
-- própria. A regra restritiva também fecha o bucket diante de policies genéricas.
-- O servidor usa service_role SOMENTE para os bytes, após autorizar o usuário.
create policy "chat_pdfs_server_only"
on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'chat-pdfs')
with check (bucket_id <> 'chat-pdfs');

create function public.is_valid_pdf_attachment(p_conversation_id uuid, p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_access_conversation(p_conversation_id)
    and p_path ~ (
      '^' || p_conversation_id::text || '/' || (select auth.uid())::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    )
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'chat-pdfs'
        and o.name = p_path
        and o.metadata ->> 'mimetype' = 'application/pdf'
    );
$$;

revoke all on function public.is_valid_pdf_attachment(uuid, text) from public, anon;
grant execute on function public.is_valid_pdf_attachment(uuid, text) to authenticated;

alter table public.messages add constraint messages_pdf_attachment_valid check (
  message_type <> 'pdf'::public.message_type
  or (
    body is null
    and attachment_path ~ (
      '^' || conversation_id::text || '/' || sender_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    )
    and octet_length(attachment_name) between 5 and 180
    and attachment_name ~* '\.pdf$'
    and attachment_name !~ '[[:cntrl:]/\\]'
  )
) not valid;

-- Um objeto validado não pode ser reutilizado em mensagens falsas/duplicadas.
create unique index messages_pdf_attachment_path_idx
on public.messages (attachment_path) where message_type = 'pdf'::public.message_type;

create policy "messages_insert_authorized_sender_pdf"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and message_type = 'pdf'::public.message_type
  and public.is_valid_pdf_attachment(conversation_id, attachment_path)
);

-- Mesmas colunas do envio de texto (#79). Identidade e datas não são livres.
revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, message_type, body, attachment_path, attachment_name)
on public.messages to authenticated;
