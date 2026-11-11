-- O estado de primeiro acesso só é liberado por uma mudança real de senha no Auth.
create function public.clear_first_access_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set must_change_password = false
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.clear_first_access_on_password_change() from public;

create trigger on_auth_password_changed
after update of encrypted_password on auth.users
for each row
when (old.encrypted_password is distinct from new.encrypted_password)
execute function public.clear_first_access_on_password_change();

-- Uma única RPC devolve as duas informações usadas na decisão de acesso.
create function public.get_access_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'authorized', (select public.is_active_authorized_user()),
    'must_change_password', coalesce((
      select u.must_change_password
      from public.users u
      where u.id = (select auth.uid())
    ), false)
  );
$$;

revoke all on function public.get_access_state() from public;
grant execute on function public.get_access_state() to authenticated;

-- As policies existentes usam esta função (mensagens e leituras indiretamente).
create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_authorized_user()
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.must_change_password = false
    )
    and exists (
      select 1 from public.conversation_participants participant
      where participant.conversation_id = p_conversation_id
        and participant.user_id = (select auth.uid())
    );
$$;
